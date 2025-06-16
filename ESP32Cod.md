#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// --- Configurações de Rede e MQTT ---
const char* ssid = "ALELUIA_CORE3_2.4GHz";
const char* password = "8HCGA8421";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP32_Servo_Client";

const char* mqtt_status_topic = "drysense/status";      // Tópico para enviar o status do servo
const char* mqtt_commands_topic = "drysense/commands";  // Tópico para receber comandos do broker

Servo meuServo;

int pinoServo = 25;
int pinoSensorChuva = 34;

int estadoChuvaAtual;
int estadoChuvaAnterior = -1;

int estadoToldoAtual = -1;

const int VELOCIDADE_PARADO = 90;
const int VELOCIDADE_HORARIO = 0;
const int VELOCIDADE_ANTI_HORARIO = 180;

const int TEMPO_ROTACAO_PULSO = 4000;

WiFiClient espClient;
PubSubClient client(espClient);

// --- Função de Callback MQTT ---
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Mensagem recebida no tópico: [");
  Serial.print(topic);
  Serial.print("] Mensagem: ");
  String message = "";

  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println(message);

  if (String(topic) == mqtt_commands_topic) {
    if (message == "estender") {

      if (estadoToldoAtual != 1) {
        Serial.println("Comando 'Estender' recebido. Girando servo no sentido horário.");
        meuServo.write(VELOCIDADE_ANTI_HORARIO);
        delay(TEMPO_ROTACAO_PULSO);
        meuServo.write(VELOCIDADE_PARADO);
        Serial.println("Servo parado após comando 'Estender'.");
        client.publish(mqtt_status_topic, "estendido");
        estadoToldoAtual = 1;
      }

      else {
        Serial.println("Comando 'Estender' recebido, mas o toldo já está estendido.");
      }

    }

    else if (message == "recolher") {
      if (estadoToldoAtual != 0) {
        Serial.println("Comando 'recolher' recebido. Girando servo no sentido anti-horário.");
        meuServo.write(VELOCIDADE_HORARIO);
        delay(TEMPO_ROTACAO_PULSO);
        meuServo.write(VELOCIDADE_PARADO);
        Serial.println("Servo parado após comando 'recolher'.");
        client.publish(mqtt_status_topic, "recolhido");
        estadoToldoAtual = 0;
      } else {
        Serial.println("Comando 'recolher' recebido, mas o toldo já está recolhido.");
      }
    }

    else {
      Serial.println("Comando desconhecido recebido.");
    }
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando-se à rede WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}

// --- Função de Reconexão MQTT ---
void reconnect_mqtt() {
  while (!client.connected()) {
    Serial.print("Tentando conexão MQTT...");

    if (client.connect(mqtt_client_id)) {
      Serial.println("conectado!");
      client.subscribe(mqtt_commands_topic);
      Serial.print("Subscrito ao tópico: ");
      Serial.println(mqtt_commands_topic);
    } else {
      Serial.print("falhou, rc=");
      Serial.print(client.state());
      Serial.println(" tentando novamente em 5 segundos");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(9600);
  Serial.println("Iniciando controle de servo com sensor de chuva e MQTT...");

  meuServo.attach(pinoServo);

  pinMode(pinoSensorChuva, INPUT);

  meuServo.write(VELOCIDADE_PARADO);
  Serial.println("Servo iniciado na posição PARADO.");

  setup_wifi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  estadoChuvaAtual = digitalRead(pinoSensorChuva);
  estadoChuvaAnterior = estadoChuvaAtual;

  if (estadoChuvaAtual == LOW) {
    Serial.println("Estado inicial: Chovendo (sensor ativo).");
    client.publish(mqtt_status_topic, "recolhido");
    estadoToldoAtual = 0;
  }

  else {
    Serial.println("Estado inicial: Não chovendo (sensor inativo).");
    client.publish(mqtt_status_topic, "estendido");
    estadoToldoAtual = 1;
  }
}

void loop() {
  if (!client.connected()) {
    reconnect_mqtt();
  }
  client.loop();

  estadoChuvaAtual = digitalRead(pinoSensorChuva);

  if (estadoChuvaAtual != estadoChuvaAnterior) {
    if (estadoChuvaAtual == LOW) {
      Serial.println("--- ÁGUA DETECTADA! ---");

      if (estadoToldoAtual != 0) {
        Serial.println("Publicando status: recolhido");
        meuServo.write(VELOCIDADE_HORARIO);
        delay(TEMPO_ROTACAO_PULSO);
        meuServo.write(VELOCIDADE_PARADO);
        client.publish(mqtt_status_topic, "recolhido");
        estadoToldoAtual = 0;
      } else {
        Serial.println("Toldo já recolhido devido à chuva.");
      }

    }

    else {
      Serial.println("--- ÁGUA NÃO DETECTADA (CHUVA CESSOU)! ---");

      if (estadoToldoAtual != 1) {
        Serial.println("Publicando status: estendido");
        meuServo.write(VELOCIDADE_ANTI_HORARIO);
        delay(TEMPO_ROTACAO_PULSO);
        meuServo.write(VELOCIDADE_PARADO);
        client.publish(mqtt_status_topic, "estendido");
        estadoToldoAtual = 1;
      }

      else {
        Serial.println("Toldo já estendido, a chuva cessou.");
      }
    }

    estadoChuvaAnterior = estadoChuvaAtual;
  }

  delay(50);
}