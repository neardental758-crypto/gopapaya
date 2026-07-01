#include <WiFi.h>
#include <esp_now.h>
#include <BluetoothSerial.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BluetoothSerial SerialBT;

#define LED_ROJO   15
#define LED_VERDE  2
#define LED_AZUL   4

#define BTN_AMARILLO 32
#define BTN_AZUL     33
#define BTN_ROJO     25
#define BTN_BLANCO   26

#define DEVICE_NAME "BRAIN_BIKE_inalambrico"

#define SERVICE_UUID   "0000a001-0000-1000-8000-00805f9b34fb"
#define CHAR_CTRL_UUID "0000a002-0000-1000-8000-00805f9b34fb"
#define CHAR_VEL_UUID  "0000a003-0000-1000-8000-00805f9b34fb"
#define CHAR_BTNS_UUID "0000a004-0000-1000-8000-00805f9b34fb"

BLECharacteristic *pCharVEL;
BLECharacteristic *pCharBTNS;

bool bleConnected = false;
bool modoBrainActivo = false;

// Soporte dinámico para hasta 6 bicicletas (Bici 1 es local, Bici 2 a 6 son inalámbricas vía ESP-NOW)
#define MAX_BICIS 6
float velProm[MAX_BICIS] = {0.0};
String estadoBici[MAX_BICIS] = {"0000", "0000", "0000", "0000", "0000", "0000"};
unsigned long ultimaRecepcion[MAX_BICIS] = {0};

String ultimoEstadoBLE = "";
unsigned long lastVelRandom = 0;

typedef struct struct_message {
  uint8_t bici_id;
  float velocidad_kmh;
  char botones[5];
  unsigned long tiempo_ms;
} struct_message;

struct_message datosRecibidos;

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleConnected = true;
    Serial.println("BLE conectado");
  }

  void onDisconnect(BLEServer* pServer) {
    bleConnected = false;
    Serial.println("BLE desconectado");
    BLEDevice::startAdvertising();
  }
};

class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) {
    String rx = pChar->getValue().c_str();

    Serial.print("BLE RX -> ");
    Serial.println(rx);

    if (rx == "brain") {
      modoBrainActivo = true;
      Serial.println("Modo Brain Activado");
    }
  }
};

void encenderLED(int pin) {
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AZUL, LOW);
  digitalWrite(pin, HIGH);
}

String leerBotonesBici1() {
  String estado = "";

  estado += (digitalRead(BTN_AMARILLO) == LOW) ? "1" : "0";
  estado += (digitalRead(BTN_AZUL)     == LOW) ? "1" : "0";
  estado += (digitalRead(BTN_ROJO)     == LOW) ? "1" : "0";
  estado += (digitalRead(BTN_BLANCO)   == LOW) ? "1" : "0";

  return estado;
}

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  memcpy(&datosRecibidos, incomingData, sizeof(datosRecibidos));

  uint8_t id = datosRecibidos.bici_id;
  if (id >= 2 && id <= MAX_BICIS) {
    uint8_t index = id - 1;
    velProm[index] = datosRecibidos.velocidad_kmh;
    estadoBici[index] = String(datosRecibidos.botones);
    ultimaRecepcion[index] = millis();

    Serial.print("ESP-NOW RX BICI ");
    Serial.print(id);
    Serial.print(" -> Botones: ");
    Serial.print(estadoBici[index]);
    Serial.print(" | Velocidad: ");
    Serial.print(velProm[index], 1);
    Serial.println(" km/h");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  randomSeed(esp_random());

  pinMode(LED_ROJO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AZUL, OUTPUT);

  pinMode(BTN_AMARILLO, INPUT_PULLUP);
  pinMode(BTN_AZUL, INPUT_PULLUP);
  pinMode(BTN_ROJO, INPUT_PULLUP);
  pinMode(BTN_BLANCO, INPUT_PULLUP);

  encenderLED(LED_ROJO);

  SerialBT.begin(DEVICE_NAME);

  WiFi.mode(WIFI_STA);

  Serial.print("MAC MAESTRA: ");
  Serial.println(WiFi.macAddress());

  if (esp_now_init() != ESP_OK) {
    Serial.println("ERROR iniciando ESP-NOW");
    return;
  }

  esp_now_register_recv_cb(OnDataRecv);

  BLEDevice::init(DEVICE_NAME);

  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pSvc = pServer->createService(SERVICE_UUID);

  pCharVEL = pSvc->createCharacteristic(
    CHAR_VEL_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharVEL->addDescriptor(new BLE2902());

  BLECharacteristic *pCharCTRL = pSvc->createCharacteristic(
    CHAR_CTRL_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharCTRL->setCallbacks(new MyCallbacks());

  pCharBTNS = pSvc->createCharacteristic(
    CHAR_BTNS_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharBTNS->addDescriptor(new BLE2902());

  pSvc->start();
  BLEDevice::startAdvertising();

  encenderLED(LED_AZUL);

  Serial.println("=========================================");
  Serial.println(" BRAIN BIKE - MAESTRA MULTI-BICI (1 a 6) ");
  Serial.println("=========================================");
  Serial.print("Nombre Bluetooth/BLE: ");
  Serial.println(DEVICE_NAME);
}

void loop() {
  if (SerialBT.hasClient() || bleConnected)
    encenderLED(LED_VERDE);
  else
    encenderLED(LED_AZUL);

  unsigned long currentTime = millis();

  // Bici 1 es local
  estadoBici[0] = leerBotonesBici1();

  if (currentTime - lastVelRandom >= 1000) {
    lastVelRandom = currentTime;
    velProm[0] = random(150, 351) / 10.0;
  }

  // Verificar desconexión/inactividad de bicis remotas (2 a 6)
  for (int i = 1; i < MAX_BICIS; i++) {
    if (currentTime - ultimaRecepcion[i] > 3000) {
      estadoBici[i] = "0000";
      velProm[i] = 0.0;
    }
  }

  static unsigned long lastDebug = 0;

  if (currentTime - lastDebug > 500) {
    Serial.println();
    for (int i = 0; i < MAX_BICIS; i++) {
      Serial.print("===== BICI ");
      Serial.print(i + 1);
      Serial.println(" =====");
      Serial.print("Botones: ");
      Serial.println(estadoBici[i]);
      Serial.print("Velocidad: ");
      Serial.print(velProm[i], 1);
      Serial.println(" km/h");
    }
    lastDebug = currentTime;
  }

  static unsigned long lastSPP = 0;

  if (currentTime - lastSPP > 1000) {
    String dataSPP = "";
    for (int i = 0; i < MAX_BICIS; i++) {
      if (i > 0) dataSPP += ",";
      dataSPP += "B" + String(i + 1) + ":" + estadoBici[i];
      dataSPP += ",V" + String(i + 1) + ":" + String(velProm[i], 1);
    }

    SerialBT.println(dataSPP);

    Serial.print("SPP TX -> ");
    Serial.println(dataSPP);

    lastSPP = currentTime;
  }

  if (bleConnected && modoBrainActivo) {
    static unsigned long lastBLEVel = 0;

    if (currentTime - lastBLEVel > 400) {
      String vBLE = "";
      for (int i = 0; i < MAX_BICIS; i++) {
        if (i > 0) vBLE += ",";
        vBLE += String(velProm[i], 1);
      }

      pCharVEL->setValue(vBLE.c_str());
      pCharVEL->notify();

      Serial.print("BLE VEL TX -> ");
      Serial.println(vBLE);

      lastBLEVel = currentTime;
    }

    String estadoBLE = "";
    for (int i = 0; i < MAX_BICIS; i++) {
      if (i > 0) estadoBLE += ",";
      estadoBLE += estadoBici[i];
    }

    if (estadoBLE != ultimoEstadoBLE) {
      pCharBTNS->setValue(estadoBLE.c_str());
      pCharBTNS->notify();

      Serial.print("BLE BTNS TX -> ");
      Serial.println(estadoBLE);

      ultimoEstadoBLE = estadoBLE;
    }
  }

  delay(10);
}