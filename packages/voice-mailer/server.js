import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

dotenv.config();

const requiredEnvVars = [
	'OPENAI_API_KEY',
	'SMTP_HOST',
	'SMTP_PORT',
	'SMTP_USER',
	'SMTP_PASS',
	'SENDER_EMAIL',
	'TARGET_EMAIL',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
	console.warn(
		`Ostrzeżenie: brakujące zmienne środowiskowe - ${missing.join(', ')}. ` +
			'Serwer może nie działać prawidłowo, dopóki nie uzupełnisz konfiguracji.',
	);
}

const openai = process.env.OPENAI_API_KEY
	? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null;

const app = express();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 25 * 1024 * 1024 },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'Nie otrzymano żadnego nagrania.' });
	}

	if (!openai) {
		return res.status(500).json({ error: 'Brak konfiguracji klienta OpenAI.' });
	}

	const tempFilePath = path.join(
		os.tmpdir(),
		`voice-mailer-${Date.now()}-${crypto.randomUUID()}.${getExtensionForMime(req.file.mimetype)}`,
	);

	try {
		await fsPromises.writeFile(tempFilePath, req.file.buffer);

		const transcriptionResponse = await openai.audio.transcriptions.create({
			file: fs.createReadStream(tempFilePath),
			model: 'gpt-4o-mini-transcribe',
			response_format: 'text',
			temperature: 0.2,
		});

		const transcriptText =
			typeof transcriptionResponse === 'string'
				? transcriptionResponse.trim()
				: (transcriptionResponse.text || '').trim();

		if (!transcriptText) {
			return res.status(500).json({ error: 'Nie udało się uzyskać transkryptu.' });
		}

		try {
			await sendEmail(transcriptText);
		} catch (emailError) {
			console.error('Błąd podczas wysyłania e-maila:', emailError);
			return res
				.status(500)
				.json({ error: 'Transkrypcja się powiodła, ale nie udało się wysłać e-maila.' });
		}

		return res.json({ success: true, transcript: transcriptText });
	} catch (error) {
		console.error('Błąd podczas przetwarzania nagrania:', error);
		return res.status(500).json({ error: 'Wystąpił problem z przetworzeniem nagrania.' });
	} finally {
		await safeUnlink(tempFilePath);
	}
});

app.use((req, res, next) => {
	if (req.method === 'GET' && req.accepts('html')) {
		return res.sendFile(path.join(__dirname, 'public', 'index.html'));
	}
	return next();
});

const port = Number.parseInt(process.env.PORT || '3000', 10);
app.listen(port, () => {
	console.log(`Voice Mailer nasłuchuje na http://localhost:${port}`);
});

function getExtensionForMime(mimeType) {
	switch (mimeType) {
		case 'audio/webm':
			return 'webm';
		case 'audio/mp4':
			return 'm4a';
		case 'audio/mpeg':
			return 'mp3';
		case 'audio/wav':
		case 'audio/x-wav':
			return 'wav';
		default:
			return 'dat';
	}
}

async function safeUnlink(filePath) {
	try {
		await fsPromises.unlink(filePath);
	} catch (error) {
		if (error && error.code !== 'ENOENT') {
			console.warn('Nie udało się usunąć pliku tymczasowego:', error);
		}
	}
}

async function sendEmail(message) {
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
		secure: Number.parseInt(process.env.SMTP_PORT || '587', 10) === 465,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	await transporter.sendMail({
		from: process.env.SENDER_EMAIL,
		to: process.env.TARGET_EMAIL,
		subject: 'Nowa transkrypcja wiadomości głosowej',
		text: message,
	});
}
