import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Class to handle PDF processing and integration with the database
 */
class PDFIntegration {
  constructor() {
    // Database connection pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'Sara',
      password: process.env.DB_PASSWORD || 'Sara0330!!',
      database: process.env.DB_NAME || 'aischool',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Create directories if they don't exist
    this.pdfDir = path.join(process.cwd(), 'uploads', 'pdfs');
    this.jsonDir = path.join(process.cwd(), 'uploads', 'processed');
    
    if (!fs.existsSync(this.pdfDir)) {
      fs.mkdirSync(this.pdfDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.jsonDir)) {
      fs.mkdirSync(this.jsonDir, { recursive: true });
    }
  }
  
  /**
   * Process a PDF file using the Python script
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Path to the processed JSON file
   */
  async processPDF(pdfPath) {
    return new Promise((resolve, reject) => {
      // Generate output path
      const fileName = path.basename(pdfPath, path.extname(pdfPath));
      const jsonPath = path.join(this.jsonDir, `${fileName}.json`);
      
      console.log(`Processing PDF: ${pdfPath}`);
      console.log(`Output will be saved to: ${jsonPath}`);
      
      // Run the Python script
      const pythonProcess = spawn('python', ['pdf_processor.py', pdfPath, '--output', jsonPath]);
      
      let outputData = '';
      let errorData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        console.log(`Python output: ${data.toString()}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python error: ${data.toString()}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error: ${errorData}`);
          reject(new Error(`PDF processing failed with code ${code}: ${errorData}`));
          return;
        }
        
        // Check if the output file exists
        if (!fs.existsSync(jsonPath)) {
          reject(new Error('PDF processing completed but output file was not created'));
          return;
        }
        
        console.log(`PDF processing completed successfully: ${jsonPath}`);
        resolve(jsonPath);
      });
    });
  }
  
  /**
   * Add a processed PDF to the database
   * @param {string} jsonPath - Path to the processed JSON file
   * @param {Object} lessonInfo - Information about the lesson
   * @returns {Promise<number>} - ID of the inserted lesson
   */
  async addToDatabase(jsonPath, lessonInfo) {
    try {
      // Read the processed JSON file
      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      // Insert into the database
      const [result] = await this.pool.query(
        'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path, summary, ai_enhanced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          lessonInfo.courseId,
          lessonInfo.weekId,
          lessonInfo.dayId,
          lessonInfo.title || jsonContent.title,
          jsonPath,
          jsonContent.summary,
          1 // Flag to indicate this is an AI-enhanced lesson
        ]
      );
      
      const lessonId = result.insertId;
      console.log(`Lesson added to database with ID: ${lessonId}`);
      
      // Add QA pairs to a separate table if it exists
      if (jsonContent.qa_pairs && jsonContent.qa_pairs.length > 0) {
        try {
          // Check if the qa_pairs table exists
          const [tableCheck] = await this.pool.query('SHOW TABLES LIKE "lesson_qa_pairs"');
          
          if (tableCheck.length === 0) {
            // Create the table if it doesn't exist
            await this.pool.query(`
              CREATE TABLE lesson_qa_pairs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lesson_id INT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
              )
            `);
            console.log('Created lesson_qa_pairs table');
          }
          
          // Insert QA pairs
          for (const pair of jsonContent.qa_pairs) {
            await this.pool.query(
              'INSERT INTO lesson_qa_pairs (lesson_id, question, answer) VALUES (?, ?, ?)',
              [lessonId, pair.question, pair.answer]
            );
          }
          
          console.log(`Added ${jsonContent.qa_pairs.length} QA pairs for lesson ${lessonId}`);
        } catch (error) {
          console.error('Error adding QA pairs:', error);
          // Continue even if QA pairs couldn't be added
        }
      }
      
      return lessonId;
    } catch (error) {
      console.error('Error adding to database:', error);
      throw error;
    }
  }
  
  /**
   * Process a PDF file and add it to the database
   * @param {string} pdfPath - Path to the PDF file
   * @param {Object} lessonInfo - Information about the lesson
   * @returns {Promise<Object>} - Information about the processed lesson
   */
  async processAndAddLesson(pdfPath, lessonInfo) {
    try {
      // Process the PDF
      const jsonPath = await this.processPDF(pdfPath);
      
      // Add to database
      const lessonId = await this.addToDatabase(jsonPath, lessonInfo);
      
      return {
        lessonId,
        jsonPath,
        success: true
      };
    } catch (error) {
      console.error('Error in processAndAddLesson:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Get lesson content from a processed JSON file
   * @param {number} lessonId - ID of the lesson
   * @returns {Promise<Object>} - Lesson content
   */
  async getLessonContent(lessonId) {
    try {
      // Get the lesson from the database
      const [lessons] = await this.pool.query(
        'SELECT * FROM lessons WHERE id = ?',
        [lessonId]
      );
      
      if (lessons.length === 0) {
        throw new Error('Lesson not found');
      }
      
      const lesson = lessons[0];
      const filePath = lesson.file_path;
      
      // Check if this is an AI-enhanced lesson (JSON file)
      if (lesson.ai_enhanced && filePath.endsWith('.json')) {
        // Read the JSON file
        if (!fs.existsSync(filePath)) {
          throw new Error('Lesson file not found');
        }
        
        const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Get QA pairs if available
        let qaPairs = [];
        try {
          const [tableCheck] = await this.pool.query('SHOW TABLES LIKE "lesson_qa_pairs"');
          if (tableCheck.length > 0) {
            const [pairs] = await this.pool.query(
              'SELECT question, answer FROM lesson_qa_pairs WHERE lesson_id = ?',
              [lessonId]
            );
            qaPairs = pairs;
          }
        } catch (error) {
          console.error('Error fetching QA pairs:', error);
        }
        
        return {
          id: lesson.id,
          title: lesson.lesson_name,
          summary: jsonContent.summary || lesson.summary,
          content: jsonContent.full_text,
          sections: jsonContent.sections || [],
          qaPairs: qaPairs.length > 0 ? qaPairs : (jsonContent.qa_pairs || [])
        };
      } else {
        // Regular file, just read the content
        if (!fs.existsSync(filePath)) {
          throw new Error('Lesson file not found');
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        return {
          id: lesson.id,
          title: lesson.lesson_name,
          content: fileContent
        };
      }
    } catch (error) {
      console.error('Error getting lesson content:', error);
      throw error;
    }
  }
}

export default new PDFIntegration(); 