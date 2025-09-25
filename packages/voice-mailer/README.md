# Voice Mailer

Prosty serwer Express z interfejsem WWW, który pozwala nagrać krótką wiadomość głosową, zamienić ją na tekst przy pomocy OpenAI Whisper i wysłać transkrypt na skonfigurowany adres e-mail.

## Wymagania

- Node.js 18 lub nowszy
- Konto OpenAI z kluczem API
- Dane dostępowe do serwera SMTP

## Konfiguracja

1. Sklonuj repozytorium i przejdź do katalogu projektu `packages/voice-mailer`.
2. Utwórz plik `.env` na podstawie `.env.example`:

   ```bash
   cp .env.example .env
   ```

3. Uzupełnij wartości zmiennych środowiskowych:

   - `OPENAI_API_KEY` – klucz API OpenAI
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – dane logowania do SMTP
   - `SENDER_EMAIL` – adres nadawcy
   - `TARGET_EMAIL` – docelowy adres, na który zostanie wysłany transkrypt

4. Zainstaluj zależności i uruchom serwer:

   ```bash
   pnpm install
   pnpm --filter @n8n/voice-mailer dev
   ```

   Domyślnie aplikacja wystartuje pod adresem [http://localhost:3000](http://localhost:3000).

## Użytkowanie

1. Otwórz stronę w przeglądarce z dostępem do mikrofonu.
2. Kliknij duży czerwony przycisk z ikoną mikrofonu, aby rozpocząć nagrywanie. Kliknij ponownie, aby zakończyć.
3. Po zakończeniu nagrania wciśnij przycisk **"Transkrybuj i wyślij"**. Aplikacja prześle plik do serwera, który wykona transkrypcję i wyśle treść na skonfigurowany e-mail.
4. Transkrypt zostanie także wyświetlony na stronie.

## Uwagi dotyczące prywatności

- Nagranie audio jest przesyłane do OpenAI wyłącznie w celu wykonania transkrypcji.
- Po przetworzeniu plik tymczasowy z nagraniem jest usuwany z serwera.
- Wysyłka e-maila odbywa się przez skonfigurowany serwer SMTP.

## Licencja

Projekt dziedziczy licencję repozytorium nadrzędnego.
