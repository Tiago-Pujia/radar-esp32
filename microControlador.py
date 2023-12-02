import machine, time, network
from hcsr04 import HCSR04
from umqtt.simple import MQTTClient
from machine import Pin, PWM, Timer

print("Ejecutando Programa")

# ===========================
# VARIABLES
# ===========================
# Switch
switch = Pin(26,Pin.IN,Pin.PULL_UP)

# Servo
servo = PWM(Pin(13,Pin.OUT),freq=50)
estado_servo = "Control Total"
direccion = 0
velocidad = 0.06

#Ultrasonido
ultrasonido=HCSR04(trigger_pin=12,echo_pin=14)
distancia_inicial = []

# MQTT
mqtt_server = "io.adafruit.com"
port=1883
topic_1 = "/feeds/radar-slash-recibo-del-esp"
topic_2 = "/feeds/radar-slash-envio-al-esp"
user = ''
password = ''
client_id = 'ESP32'
clientMQTT = MQTTClient(client_id,mqtt_server,user=user,password=password,port=int(port))

# ===========================
# FUNCIONES PREDETERMINADAS
# ===========================
def conectarse_wifi():
    ssid = ""
    password = ""
    
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(True)
    sta_if.connect(ssid,password)
    
    print("Conectando", end="")
    while not sta_if.isconnected():
        print(".", end="")
        time.sleep(0.1)
    print("Conectado al wifi")

def enviar_mensaje_mqtt(msg):
    try:
        clientMQTT.publish(topic_1,msg)
    except Exception as e:
        print("Error al enviar mensaje:", e)

def recibo_mensaje_mqtt(topic,msg):
    msg = msg.decode('utf-8')
    
    definir_estado(msg)
    # Peticion para preguntar en que estado se encuentra el dispositivo
    if msg.lower() == "estado actual":
        enviar_mensaje_mqtt("estado:"+estado_servo)
    print(msg)

def conectarse_mqtt():
    try:
        clientMQTT.set_callback(recibo_mensaje_mqtt)
        clientMQTT.connect()
        clientMQTT.subscribe(topic_2)
        print("Conectando con Broker MQTT")
    except OSError as e:
        print("Error conexión, reiniciando")
        time.sleep(5)
        machine.reset()
    
def checkeo_msg(timer):
    try:
        clientMQTT.check_msg()
    except OSError as e:
        print("Error", e)
        time.sleep(5)
        machine.reset()

# ===========================
# FUNCIONES LOGICAS
# ===========================

def definir_estado(msg):
    global estado_servo
    # estado:Control Angulo Fijo=156
    if "estado" in msg and ("Control Total" in msg or "Deshabilitar" in msg or "Control Angulo Fijo" in msg):
        estado_servo = msg[7:]
        enviar_mensaje_mqtt("estado:"+estado_servo)
        enviar_mensaje_mqtt("radar:"+('0'*181))
        
def calcular_distancia_inicial():
    global distancia_inicial
    
    for i in range(0,181):
        servo.duty(round(i/1.8+25))
        time.sleep(velocidad)
        distancia = round(ultrasonido.distance_cm())
        distancia_inicial.append((distancia))
    # Vemos la distancia inicial que hay en el area y guardamos los datos en un array con la distancia en cm en cada grado que se encuentra
        
def detectar_movimiento(angulo):
    global distancia_inicial
    
    servo.duty(round(angulo/1.8+25))
    time.sleep(velocidad)
    distancia = round(ultrasonido.distance_cm())
    movimiento = '1' if abs(distancia - distancia_inicial[angulo]) >= 30 else '0'
    # Comparamos la distancia inicial con la actual, si hubo una diferencia mayor igual que 10 la tomamos como movimiento
    distancia_inicial[angulo] = distancia
    # La nueva distancia obtenida la remplazamos con los datos obtenidos en el primer giro
    
    if(int(movimiento)):
        print("Movimiento Detectado")
    return movimiento #retorna 1 si vio movimiento o 0 si no lo hubo

def angulo_rotando():
    global direccion
    
    radar = ""

    if direccion:
        for i in range(0,181):
            radar += detectar_movimiento(i)
            """
            La funcion de detectar movimiento devuelve 1 si lo hubo o 0 si no.
            Unimos todos los bits obtenidos desde el angulo 0 a 180 en una cadena, y la posicion del bit dentro de la cadena indica el angulo
            """
            if estado_servo != "Control Total" or switch.value(): return
        direccion = 0
    else:
        for i in range(180,-1,-1):
            radar += detectar_movimiento(i)
            if estado_servo != "Control Total" or switch.value(): return
        radar = ''.join(reversed(radar))
        direccion = 1
        
    #if '1' in radar:
    enviar_mensaje_mqtt("radar:"+radar)
    # Solo se envia si encontro movimiento

def angulo_fijo():
    angulo=int(estado_servo[20:])
    movimiento = detectar_movimiento(angulo)
    if int(movimiento):
        enviar_mensaje_mqtt("radar_fijo:"+movimiento)
        time.sleep(1)

# ===========================
# MAIN
# ===========================

conectarse_wifi()
conectarse_mqtt()
calcular_distancia_inicial()

# Timer permite repetir una funcion cada X tiempo, en este caso chequear mensajes nuevos.
#La modificacion del estado es automatica
Timer(1).init(mode=Timer.PERIODIC, period=4000, callback=checkeo_msg)

while True:
    if not switch.value():
        if "Control Total" in estado_servo:
            angulo_rotando()
        elif "Control Angulo Fijo" in estado_servo:
            angulo_fijo()