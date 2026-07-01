# Protocolo de Comunicación Bluetooth BLE - ESP32 y Brain Bike

Este documento detalla el protocolo de comunicación BLE (Bluetooth Low Energy) que espera la aplicación para comunicarse con el ESP32 en el juego **Brain Bike**.

---

## 1. UUID de Servicio y Características

La aplicación utiliza un único servicio GATT principal con tres características:

* **Servicio Principal**: `0000a001-0000-1000-8000-00805f9b34fb`
* **Característica ID (`id`)**: `0000a002-0000-1000-8000-00805f9b34fb` (Lectura / Escritura)
* **Característica Velocidad (`vel`)**: `0000a003-0000-1000-8000-00805f9b34fb` (Notificación / Lectura)
* **Característica Botones (`btns`)**: `0000a004-0000-1000-8000-00805f9b34fb` (Notificación / Lectura)

---

## 2. Flujo de Inicialización (Escritura)

Al conectar el ESP32, la aplicación envía un comando de texto inicial a la característica de **ID** para inicializar el dispositivo:

* **Comando enviado**: `"brain"` (enviado como bytes codificados en texto usando `UTF-8`).

---

## 3. Formato de Transmisión de Velocidad (`vel`)

La aplicación se suscribe a la característica de velocidad para recibir actualizaciones continuas de la velocidad de ambas bicicletas.

### Formato esperado (String):
```text
v[Velocidad_Bici_1],[Velocidad_Bici_2]
```
*La `'v'` inicial es opcional (la aplicación la elimina con una expresión regular si está presente).*

### Ejemplos válidos:
* `v12.5,15.8`
* `12.5,15.8`

### Orden de datos:
1. **Primer valor (antes de la coma `,`)**: Velocidad de la **Bicicleta 1** (corresponde a `numeroBicicleta = 1`).
2. **Segundo valor (después de la coma `,`)**: Velocidad de la **Bicicleta 2** (corresponde a `numeroBicicleta = 2`).

---

## 4. Formato de Transmisión de Botones (`btns`)

La aplicación se suscribe a la característica de botones para recibir eventos cuando los usuarios presionan los botones de colores en sus manubrios.

### Formato esperado (String):
```text
[Botonera_Bici_1],[Botonera_Bici_2]
```
*Cada grupo de botonera debe medir **exactamente 4 caracteres** de longitud, donde cada posición representa el estado del botón (`'0'` para apagado, `'1'` para presionado).*

### Ejemplos válidos:
* `0100,0000` (Botonera 1 tiene el 2º botón presionado; botonera 2 no tiene ninguno presionado).
* `0000,0001` (Botonera 1 no tiene botones; botonera 2 tiene el 4º botón presionado).

### Mapeo de botones por índice (0 a 3):
* **Índice 0 (1º caracter)**: Botón **Amarillo** (`#FFF700`)
* **Índice 1 (2º caracter)**: Botón **Celeste/Azul** (`#00F0FF`)
* **Índice 2 (3º caracter)**: Botón **Rojo** (`#FF003C`)
* **Índice 3 (4º caracter)**: Botón **Blanco** (`#FFFFFF`)

---

## Referencias en el Código
* El servicio Angular que gestiona el BLE está en: [ble-esp32-brain-bike.service.ts](file:///Users/user/Desktop/gopapaya/gopapaya/src/app/features/services/brain-bike/ble-esp32-brain-bike.service.ts).
* La suscripción y procesamiento de los eventos de velocidad y botones se encuentran en [juego.component.ts](file:///Users/user/Desktop/gopapaya/gopapaya/src/app/features/brain-bike/juego/juego.component.ts) (alrededor de las líneas 406 - 476).
