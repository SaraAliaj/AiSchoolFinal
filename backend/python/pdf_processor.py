import os
import json
import glob
import string
from typing import Dict, Any, List, Optional
import fitz  # PyMuPDF
import re
import pymysql
from config import Config

# Try to import our new module - if it fails, we'll use the basic extraction
try:
    import process_pdf as pdf_extractor
    HAS_ADVANCED_EXTRACTOR = True
except ImportError:
    HAS_ADVANCED_EXTRACTOR = False

def get_db_connection():
    """
    Get a connection to the MySQL database
    """
    try:
        connection = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        return None

def get_lesson_pdf_path(lesson_id: str) -> Optional[str]:
    """
    Get the PDF file path for a lesson from the database or downloads directory
    """
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        with connection.cursor() as cursor:
            # Query to get the file_path for the lesson
            sql = "SELECT file_path FROM lessons WHERE id = %s"
            cursor.execute(sql, (lesson_id,))
            result = cursor.fetchone()
            
            # Get the downloads directory path
            downloads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
            
            if result and result.get('file_path'):
                file_path = result.get('file_path')
                print(f"Found file_path in database for lesson {lesson_id}: {file_path}")
                
                # If file_path is just a filename or relative path, convert to full path
                if not os.path.isabs(file_path):
                    # Check if the path already starts with 'downloads/'
                    if file_path.startswith('downloads/'):
                        # Just join with the base directory
                        absolute_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file_path)
                    else:
                        # If not, add the downloads directory
                        absolute_file_path = os.path.join(downloads_dir, file_path)
                    
                    file_path = absolute_file_path
                    print(f"Resolved to absolute path: {file_path}")
                
                # Verify the file exists
                if os.path.exists(file_path):
                    print(f"✅ PDF file found at path: {file_path}")
                    return file_path
                else:
                    print(f"❌ PDF file NOT found at path: {file_path}")
            
            # If no file found in database or file doesn't exist, try to find it in downloads
            print(f"Searching for PDF in downloads directory: {downloads_dir}")
            
            # Get all PDF files in the downloads directory
            pdf_files = glob.glob(os.path.join(downloads_dir, '*.pdf'))
            
            if not pdf_files:
                print("❌ No PDF files found in downloads directory")
                return None
            
            # Try to find the most recent PDF file
            latest_pdf = max(pdf_files, key=os.path.getctime)
            print(f"✅ Found latest PDF file: {latest_pdf}")
            return latest_pdf
            
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        return None
    finally:
        connection.close()

def getLessonContent(lesson_id: str) -> Dict[str, Any]:
    """
    Get lesson content for a given lesson ID
    """
    return process_pdf(lesson_id)

def process_pdf(lesson_id: str) -> Dict[str, Any]:
    """
    Process a PDF file and return its content
    First attempts to get the file path from the database
    """
    # Try to get the PDF path from the database
    pdf_path = get_lesson_pdf_path(lesson_id)
    
    # If not found in the database, fall back to the downloads directory
    if not pdf_path:
        print(f"No file path found in database for lesson {lesson_id}, checking downloads directory")
        downloads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
        
        # Try different filename patterns
        patterns = [
            f"*lesson*{lesson_id}*.pdf",  # Direct lesson ID
            f"*lesson*{int(lesson_id) - 10}*.pdf" if lesson_id.isdigit() else None,  # Adjusted lesson number
            "*.pdf"  # Any PDF if desperate
        ]
        
        pdf_files = []
        for pattern in patterns:
            if pattern:
                matches = glob.glob(os.path.join(downloads_dir, pattern))
                if matches:
                    pdf_files = matches
                    pattern_used = pattern
                    print(f"Found {len(matches)} PDFs matching pattern '{pattern}'")
                    break
        
        if pdf_files:
            pdf_path = pdf_files[0]
            print(f"Using PDF from downloads directory: {os.path.basename(pdf_path)}")
    
    # Process the PDF if found
    if pdf_path:
        print(f"Processing PDF for lesson {lesson_id}: {pdf_path}")
        
        # Try to use the advanced extractor if available
        if HAS_ADVANCED_EXTRACTOR:
            try:
                print(f"Using advanced PDF content extraction for {os.path.basename(pdf_path)}...")
                result = pdf_extractor.extract_structured_content(pdf_path, lesson_id)
                # If successful, return the structured content
                if result and not result.get('error'):
                    print(f"✅ Successfully extracted structured content from PDF")
                    return result
                else:
                    print(f"⚠️ Advanced extraction failed: {result.get('error', 'Unknown error')}")
                    # Fall back to basic extraction
            except Exception as e:
                print(f"⚠️ Error using advanced extractor: {str(e)}")
                # Fall back to basic extraction
        
        # Basic extraction as fallback
        pdf_content = extract_text_from_pdf(pdf_path)
        
        # Extract filename from path for better title
        file_name = os.path.basename(pdf_path)
        title = f"Lesson {lesson_id}"
        
        # Try to extract a better title from the PDF content
        if pdf_content:
            # Look for lesson title pattern in the content 
            title_match = re.search(r"(?:Lesson|Module)\s+\d+:?\s*(.+?)(?:\n|$)", pdf_content)
            if title_match:
                extracted_title = title_match.group(1).strip()
                if extracted_title:
                    title = f"Lesson {lesson_id}: {extracted_title}"
            # If no title found, use filename
            elif file_name:
                title = f"Lesson {lesson_id}: {file_name}"
        
        # If we have PDF content, use it to create a lesson entry
        if pdf_content:
            # Try to structure the content a bit
            structured_content = structure_basic_content(pdf_content, lesson_id, title)
            
            return {
                'id': lesson_id,
                'title': title,
                'content': structured_content,
                'raw_content': pdf_content,
                'pdf_path': pdf_path,
                'has_pdf': True
            }
    
    # If no PDF was found or content couldn't be extracted
    print(f"❌ No valid PDF content found for lesson ID: {lesson_id}")
    
    # Create a more detailed error message
    error_message = "No PDF file was found for this lesson. "
    error_message += "Please check that:\n"
    error_message += "1. The lesson has a valid file_path in the database\n"
    error_message += "2. The file exists in the expected location\n"
    error_message += "3. The file has the correct permissions\n\n"
    
    # Add diagnostic info if lesson_id is numeric
    if lesson_id.isdigit():
        try:
            lesson_num = int(lesson_id) - 10
            if 1 <= lesson_num <= 8:
                error_message += f"This appears to be Lesson {lesson_num} (Week {(lesson_num-1)//5 + 1}, Day {((lesson_num-1)%5) + 1}).\n"
        except:
            pass
            
    error_message += "\nPlease upload a PDF for this lesson or check the database configuration."
    
    return {
        'id': lesson_id,
        'title': f'Lesson {lesson_id}',
        'summary': 'No content available for this lesson.',
        'content': error_message,
        'qa_pairs': [],
        'qaPairs': [],
        'has_pdf': False,
        'error': 'PDF not found'
    }

def structure_basic_content(text: str, lesson_id: str, title: str) -> str:
    """
    Apply basic structure to extracted PDF text to make it more readable
    """
    # Try to identify common sections using regex
    structured_text = f"TITLE: {title}\n\n"
    
    # Look for Objective section
    objective_match = re.search(r"(?:Objective|Goal)s?:?\s*(.+?)(?:\n\n|\n[A-Z]|\n\d\.)", text, re.DOTALL | re.IGNORECASE)
    if objective_match:
        objective = objective_match.group(1).strip()
        structured_text += f"OBJECTIVE:\n{objective}\n\n"
    
    # Look for Key Concepts section
    key_concepts_match = re.search(r"(?:Key\s+Concepts|Main\s+Topics|Key\s+Points):?\s*(.+?)(?:\n\n|\n[A-Z]|\nApplication:)", text, re.DOTALL | re.IGNORECASE)
    if key_concepts_match:
        key_concepts = key_concepts_match.group(1).strip()
        structured_text += f"KEY CONCEPTS:\n{key_concepts}\n\n"
    
    # If we couldn't find any sections, just use the full text
    if len(structured_text) < len(title) + 20:
        structured_text += "CONTENT:\n" + text
    
    return structured_text

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file using PyMuPDF
    """
    try:
        text = ""
        with fitz.open(pdf_path) as doc:
            for page in doc:
                page_text = page.get_text()
                text += page_text
                
                # Add a separator between pages for clarity
                if not page_text.endswith('\n'):
                    text += '\n'
                text += '---\n'
        
        return text
    except Exception as e:
        print(f"Error extracting text from PDF {pdf_path}: {str(e)}")
        return f"Error extracting text from PDF: {str(e)}"

def generate_qa_pairs(content: str) -> list:
    """
    Generate QA pairs from content
    To be implemented with your QA generation logic
    """
    # Placeholder for actual QA generation
    return [] 