const recordButton = document.getElementById('recordButton');
const transcribeButton = document.getElementById('transcribeButton');
const statusElement = document.getElementById('status');
const transcriptElement = document.getElementById('transcript');

let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;
let mediaStream;

const uiState = {
	recording: false,
	transcribing: false,
	hasRecording: false,
};

recordButton.addEventListener('click', async () => {
	if (mediaRecorder && mediaRecorder.state === 'recording') {
		stopRecording();
		return;
	}

	try {
		await startRecording();
	} catch (error) {
		console.error('Nie udało się rozpocząć nagrywania', error);
		statusElement.textContent = 'Nie udało się uzyskać dostępu do mikrofonu.';
	}
});

transcribeButton.addEventListener('click', async () => {
	if (!recordedBlob) {
		statusElement.textContent = 'Najpierw nagraj wiadomość.';
		return;
	}

	const formData = new FormData();
	formData.append('audio', recordedBlob, 'recording.webm');

	setButtonsState({ transcribing: true });
	statusElement.textContent = 'Przetwarzanie nagrania…';

	try {
		const response = await fetch('/api/transcribe', {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorPayload = await response.json().catch(() => ({}));
			throw new Error(errorPayload.error || 'Serwer zwrócił błąd.');
		}

		const data = await response.json();
		transcriptElement.textContent = data.transcript;
		transcriptElement.focus();
		statusElement.textContent = 'Transkrypt wysłany na e-mail.';
	} catch (error) {
		console.error('Błąd podczas transkrypcji', error);
		statusElement.textContent = error.message || 'Nie udało się przetworzyć nagrania.';
	} finally {
		setButtonsState({ transcribing: false, hasRecording: Boolean(recordedBlob) });
	}
});

async function startRecording() {
	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		throw new Error('Twoja przeglądarka nie obsługuje nagrywania audio.');
	}

	statusElement.textContent = 'Proszę zezwolić na dostęp do mikrofonu…';

	if (!mediaStream) {
		mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
	}

	mediaRecorder = new MediaRecorder(mediaStream);
	recordedChunks = [];
	recordedBlob = null;

	mediaRecorder.addEventListener('dataavailable', (event) => {
		if (event.data.size > 0) {
			recordedChunks.push(event.data);
		}
	});

	mediaRecorder.addEventListener('stop', () => {
		recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
		setButtonsState({ recording: false, hasRecording: recordedBlob.size > 0 });
		if (recordedBlob.size > 0) {
			statusElement.textContent = 'Nagranie zakończone. Możesz wysłać transkrypt.';
		} else {
			statusElement.textContent = 'Nagranie jest puste. Spróbuj ponownie.';
		}
	});

	mediaRecorder.start();
	setButtonsState({ recording: true, hasRecording: false });
	statusElement.textContent = 'Nagrywanie w toku… kliknij ponownie, aby zakończyć.';
}

function stopRecording() {
	if (mediaRecorder && mediaRecorder.state === 'recording') {
		mediaRecorder.stop();
	}
}

function setButtonsState(partialState = {}) {
	Object.assign(uiState, partialState);

	recordButton.classList.toggle('recording', uiState.recording);
	recordButton.setAttribute('aria-pressed', uiState.recording ? 'true' : 'false');
	recordButton.querySelector('.label').textContent = uiState.recording
		? 'Zatrzymaj nagrywanie'
		: 'Rozpocznij nagrywanie';

	recordButton.disabled = uiState.transcribing;
	transcribeButton.disabled = uiState.recording || uiState.transcribing || !uiState.hasRecording;
}
