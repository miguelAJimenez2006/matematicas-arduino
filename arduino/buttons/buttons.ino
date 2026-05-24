// ── Pines ──────────────────────────────────────────────────
const int PIN_A     = 2;   // Botón A
const int PIN_B     = 3;   // Botón B
const int PIN_C     = 4;   // Botón C
const int PIN_D     = 5;   // Botón D
const int LED_GREEN = 9;   // LED verde (correcto)
const int LED_RED   = 8;   // LED rojo  (incorrecto)

// ── Debounce ────────────────────────────────────────────────
int prevA = HIGH, prevB = HIGH, prevC = HIGH, prevD = HIGH;
unsigned long lastSend   = 0;
const unsigned long DEBOUNCE_MS = 200;

// ── Bloqueo ─────────────────────────────────────────────────
// Mientras espera la respuesta de la PC (y durante el LED)
// los botones no se aceptan para evitar doble-envío.
bool locked = false;

// ── Temporizador LED ────────────────────────────────────────
unsigned long ledOffAt = 0;
const unsigned long LED_MS = 1500;   // tiempo que permanece el LED encendido

// ── Buffer Serial entrante ──────────────────────────────────
String serialBuf = "";

void setup() {
  Serial.begin(9600);

  pinMode(PIN_A, INPUT_PULLUP);
  pinMode(PIN_B, INPUT_PULLUP);
  pinMode(PIN_C, INPUT_PULLUP);
  pinMode(PIN_D, INPUT_PULLUP);

  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED,   OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED,   LOW);
}

void loop() {

  // ── 1. Leer comandos de la PC (GREEN / RED) ───────────────
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      serialBuf.trim();
      if (serialBuf == "GREEN") {
        digitalWrite(LED_GREEN, HIGH);
        digitalWrite(LED_RED,   LOW);
        ledOffAt = millis() + LED_MS;
      } else if (serialBuf == "RED") {
        digitalWrite(LED_RED,   HIGH);
        digitalWrite(LED_GREEN, LOW);
        ledOffAt = millis() + LED_MS;
      }
      serialBuf = "";
    } else {
      serialBuf += c;
    }
  }

  // ── 2. Apagar LED al vencer el tiempo ─────────────────────
  if (ledOffAt > 0 && millis() >= ledOffAt) {
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED,   LOW);
    ledOffAt = 0;
    locked   = false;   // habilitar botones de nuevo
  }

  // ── 3. Leer botones (solo si no está bloqueado) ───────────
  if (!locked) {
    int a = digitalRead(PIN_A);
    int b = digitalRead(PIN_B);
    int c = digitalRead(PIN_C);
    int d = digitalRead(PIN_D);

    unsigned long now = millis();
    if (now - lastSend >= DEBOUNCE_MS) {
      if (prevA == HIGH && a == LOW) { Serial.println("A"); lastSend = now; locked = true; }
      if (prevB == HIGH && b == LOW) { Serial.println("B"); lastSend = now; locked = true; }
      if (prevC == HIGH && c == LOW) { Serial.println("C"); lastSend = now; locked = true; }
      if (prevD == HIGH && d == LOW) { Serial.println("D"); lastSend = now; locked = true; }
    }

    prevA = a; prevB = b; prevC = c; prevD = d;
  }

  delay(10);
}
