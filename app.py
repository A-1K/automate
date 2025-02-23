import re
import pdfplumber
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

def extract_transactions_from_pdf(pdf_file):
    transactions = []
    transaction_pattern = re.compile(r'(\d{1,2} \w{3}, \d{4})\s+([\w\s\/-]+)\s+([+-]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)')

    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue  # Skip empty pages
            
            lines = text.split("\n")
            for line in lines:
                match = transaction_pattern.search(line)
                if match:
                    date = match.group(1)  # Extract the date
                    raw_description = match.group(2).strip()  # Extract raw description
                    amount_str = match.group(3).replace(",", "").replace("+", "").strip()
                    
                    # Remove long transaction codes like "TRANSF DR/OGT/..."
                    cleaned_description = re.sub(r'TRANSF [A-Z]+/[A-Z]+/\S+', '', raw_description).strip()

                    try:
                        amount = float(amount_str)  # Convert amount to float
                        transaction_type = "credit" if "+" in match.group(3) else "debit"
                        transactions.append({
                            "date": date,
                            "description": cleaned_description if cleaned_description else "Miscellaneous",
                            "amount": amount,
                            "type": transaction_type
                        })
                    except ValueError:
                        continue  # Skip invalid amounts

    return transactions

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    transactions = extract_transactions_from_pdf(file)
    
    return jsonify({"transactions": transactions})

@app.route("/env", methods=['GET'])
def get_env():
    return jsonify({
        "clientId": os.getenv("AZURE_CLIENT_ID"),
        "redirectUri": os.getenv("AZURE_REDIRECT_URI")
    })

if __name__ == '__main__':
    app.run(debug=True)
