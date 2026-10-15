require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static('public'));

app.post('/api/process-lecture', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file âm thanh!' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype || 'audio/mp3';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fileBuffer = fs.readFileSync(filePath);
    const audioPart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType: mimeType
      },
    };

    const prompt = `
    Bạn là một trợ lý học tập thông minh. Hãy nghe file ghi âm bài giảng này và trả về kết quả dưới dạng JSON chính xác tuyệt đối (không kèm markdown rườm rà ngoài JSON) với cấu trúc sau:
    {
      "summary": "Bản tóm tắt chi tiết các ý chính, khái niệm quan trọng của bài giảng bằng tiếng Việt.",
      "keywords": ["từ_khóa_1", "từ_khóa_2", "từ_khóa_3"],
      "quiz": [
        {
          "question": "Câu hỏi trắc nghiệm ôn tập?",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "answer": "Đáp án đúng"
        }
      ]
    }
    `;

    const result = await model.generateContent([audioPart, prompt]);
    const response = await result.response;
    let rawText = response.text().trim();

    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    fs.unlinkSync(filePath);

    const aiResult = JSON.parse(rawText);
    res.json(aiResult);

  } catch (error) {
    console.error(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý AI: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});