import fitz  # PyMuPDF
import os
import re
from typing import Dict, Any, List, Optional

def extract_structured_content(pdf_path: str, lesson_id: str) -> Dict[str, Any]:
    """
    Extract structured content from a PDF file, attempting to identify sections like objectives, key concepts, etc.
    """
    if not os.path.exists(pdf_path):
        return {"error": f"PDF file not found at {pdf_path}"}
    
    try:
        # Extract full text first
        full_text = ""
        toc = []
        
        with fitz.open(pdf_path) as doc:
            # Try to extract table of contents if available
            try:
                toc = doc.get_toc()
            except:
                pass
                
            # Extract text from each page
            for page in doc:
                full_text += page.get_text()
        
        # Create filename-based title
        filename = os.path.basename(pdf_path)
        title = f"Lesson {lesson_id}"
        if filename:
            title = f"{title}: {filename}"
        
        # Try to extract lesson title from content
        title_match = re.search(r"Lesson\s+\d+:?\s*(.+?)(?:\n|$)", full_text)
        if title_match:
            extracted_title = title_match.group(1).strip()
            if extracted_title:
                title = f"Lesson {lesson_id}: {extracted_title}"
        
        # Try to identify sections
        sections = {}
        
        # Look for objective section
        objective_match = re.search(r"(?:Objective|Goal)s?:?\s*(.+?)(?:\n\n|\n[A-Z]|\n\d\.)", full_text, re.DOTALL | re.IGNORECASE)
        if objective_match:
            sections["objective"] = objective_match.group(1).strip()
        
        # Look for key concepts section
        key_concepts_match = re.search(r"(?:Key\s+Concepts|Main\s+Topics|Key\s+Points):?\s*(.+?)(?:\n\n|\n[A-Z]|\nApplication:)", full_text, re.DOTALL | re.IGNORECASE)
        if key_concepts_match:
            concepts_text = key_concepts_match.group(1).strip()
            # Extract bullet points
            concepts = []
            for line in concepts_text.split('\n'):
                cleaned = re.sub(r'^\s*[•\-\*o\d]+[\.\)]\s*', '', line).strip()
                if cleaned and not cleaned.isspace():
                    concepts.append(cleaned)
            
            if concepts:
                sections["key_concepts"] = concepts
        
        # Look for application or examples section
        application_match = re.search(r"(?:Application|Examples?|Implementation):?\s*(.+?)(?:\n\n\S|$)", full_text, re.DOTALL | re.IGNORECASE)
        if application_match:
            sections["application"] = application_match.group(1).strip()
        
        # For a discussion section
        discussion_match = re.search(r"(?:Discussion|Additional\s+Notes):?\s*(.+?)(?:\n\n\S|$)", full_text, re.DOTALL | re.IGNORECASE)
        if discussion_match:
            sections["discussion"] = discussion_match.group(1).strip()
        
        # Return structured content
        result = {
            "id": lesson_id,
            "title": title,
            "full_text": full_text,
            "pdf_path": pdf_path,
            "has_pdf": True,
            "word_count": len(full_text.split()),
            "sections": sections,
            "toc": toc
        }
        
        # Format sections into a more readable content
        formatted_content = f"TITLE: {title}\n\n"
        
        if "objective" in sections:
            formatted_content += f"OBJECTIVE:\n{sections['objective']}\n\n"
            
        if "key_concepts" in sections:
            formatted_content += "KEY CONCEPTS:\n"
            for i, concept in enumerate(sections['key_concepts']):
                formatted_content += f"{i+1}. {concept}\n"
            formatted_content += "\n"
            
        if "application" in sections:
            formatted_content += f"APPLICATION:\n{sections['application']}\n\n"
            
        if "discussion" in sections:
            formatted_content += f"DISCUSSION:\n{sections['discussion']}\n\n"
        
        # If no sections were found, just include the full text
        if not sections:
            formatted_content += f"CONTENT:\n{full_text}\n"
            
        result["content"] = formatted_content
            
        return result
    
    except Exception as e:
        return {
            "id": lesson_id,
            "title": f"Lesson {lesson_id}",
            "content": f"Error processing PDF: {str(e)}",
            "pdf_path": pdf_path,
            "has_pdf": True,
            "error": str(e)
        }

def analyze_pdf_topic(pdf_path: str) -> Dict[str, Any]:
    """
    Analyze a PDF to determine its main topic and keywords.
    Useful for categorizing PDFs.
    """
    if not os.path.exists(pdf_path):
        return {"error": "PDF not found"}
    
    try:
        # Extract first page text
        with fitz.open(pdf_path) as doc:
            if doc.page_count > 0:
                first_page_text = doc[0].get_text()
                
                # Look for a lesson title
                title_match = re.search(r"(?:Lesson|Unit|Module)\s+\d+:?\s*(.+?)(?:\n|$)", first_page_text)
                lesson_title = title_match.group(1).strip() if title_match else "Unknown lesson"
                
                # Extract keywords from the first page
                common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "as", "from"}
                words = [word.strip(string.punctuation).lower() for word in first_page_text.split()]
                word_freq = {}
                for word in words:
                    if word and len(word) > 3 and word not in common_words:
                        word_freq[word] = word_freq.get(word, 0) + 1
                
                top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
                
                return {
                    "filename": os.path.basename(pdf_path),
                    "title": lesson_title,
                    "keywords": [kw[0] for kw in top_keywords],
                    "preview": first_page_text[:200] + "..."
                }
            else:
                return {"error": "PDF has no pages"}
    except Exception as e:
        return {"error": str(e)} 