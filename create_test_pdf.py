import struct

def create_simple_pdf():
    # Create a minimal valid PDF
    content = """%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 700 Td
(John Doe) Tj
0 -20 Td
(Software Engineer) Tj
0 -20 Td
(john.doe@email.com | (555) 123-4567) Tj
0 -40 Td
(EXPERIENCE) Tj
0 -20 Td
(Senior Software Engineer | Tech Corp | 2020-2024) Tj
0 -20 Td
(- Developed scalable web applications using React and Node.js) Tj
0 -20 Td
(- Led a team of 5 developers) Tj
0 -40 Td
(SKILLS) Tj
0 -20 Td
(JavaScript, Python, React, Node.js, SQL) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000138 00000 n 
0000000270 00000 n 
0000000522 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
599
%%EOF"""
    
    with open('test_resume.pdf', 'wb') as f:
        f.write(content.encode('latin-1'))
    print("Created test_resume.pdf")

if __name__ == "__main__":
    create_simple_pdf()
