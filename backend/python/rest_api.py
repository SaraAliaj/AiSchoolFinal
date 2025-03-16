from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import Error
import json
from pydantic import BaseModel
from typing import Any, Dict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection configuration
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'aischool')
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL Database: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

class PersonalInfoRequest(BaseModel):
    section: str
    data: Dict[str, Any]
    user_id: int

@app.post("/personal-info")
async def save_personal_info(request: PersonalInfoRequest):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        # Check if section exists for user
        cursor.execute(
            "SELECT id FROM personal_information WHERE user_id = %s AND section_name = %s",
            (request.user_id, request.section)
        )
        existing_record = cursor.fetchone()

        if existing_record:
            # Update existing record
            cursor.execute(
                "UPDATE personal_information SET section_data = %s WHERE user_id = %s AND section_name = %s",
                (json.dumps(request.data), request.user_id, request.section)
            )
        else:
            # Insert new record
            cursor.execute(
                "INSERT INTO personal_information (user_id, section_name, section_data) VALUES (%s, %s, %s)",
                (request.user_id, request.section, json.dumps(request.data))
            )

        connection.commit()
        cursor.close()
        connection.close()

        return {"message": "Personal information saved successfully"}

    except Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error saving personal information: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 