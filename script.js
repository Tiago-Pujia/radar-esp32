// ============================
// CLASES
// ============================
class Radar {
    data = "0".repeat(180);
    tag_radar = null;
    velocidad = 20;
    habilitar_giro = 1;
    angulo_fijo = null;

    constructor(tag_radar) {
        this.tag_radar = tag_radar;

        this.create_radar();
        this.radar_rotando();
    }

    create_radar() {
        let fragment = document.createDocumentFragment();

        if (!this.tag_radar.querySelector(".giro")) {
            const create_tag = document.createElement("div");
            create_tag.classList.add("giro");
            this.tag_radar.append(create_tag);
        }

        for (let i = 0; i <= 180; i++) {
            const tag_create = document.createElement("div");
            tag_create.style.rotate = `${i + 270}deg`;
            tag_create.classList.add("fondo");
            fragment.append(tag_create);
        }

        this.tag_radar.append(fragment);
    }

    radar_rotando() {
        let i = 1;
        let direccion = 0;
        let tags_fondo = this.tag_radar.querySelectorAll(".fondo");

        setInterval(() => {
            let elementoDibujar = -i + 180;
            this.tag_radar.querySelector(".giro").style.rotate = `${elementoDibujar + 270}deg`;

            tags_fondo[elementoDibujar].classList.remove("movimiento");
            if (!this.angulo_fijo && parseInt(this.data[i])) {
                tags_fondo[elementoDibujar].classList.add("movimiento");
                // this.data = this.data.slice(1);
            } else if (i == this.angulo_fijo && parseInt(this.data)) {
                tags_fondo[-this.angulo_fijo + 180].classList.add("movimiento");
                this.data = this.data.slice(1);
            }

            if (i == 180) direccion = 1;
            else if (i == 0) direccion = 0;

            i += direccion ? -1 : +1;
        }, this.velocidad);
    }
}

class Comunicacion_Radar {
    url = "io.adafruit.com";
    puerto = "443";
    topico_recibo = "tiagopujia/feeds/radar-slash-recibo-del-esp";
    topico_envio = "tiagopujia/feeds/radar-slash-envio-al-esp";
    usuario = "tiagopujia";
    password = "aio_XEsU52K93yYgBKZvyEGNA7P9R9Bw";
    client_id = "API_Darshboard";
    MQTT = "";

    constructor() {
        this.MQTT = mqtt.connect(`wss://${this.url}/mqtt:${this.puerto}`, {
            username: this.usuario,
            password: this.password,
            clientId: this.clientId,
        });
        this.conectarse();
        this.MQTT.on("message", (topic, msg) => {
            this.recibo_mensaje(msg.toString());
            // client.end();
        });
    }

    conectarse() {
        this.MQTT.on("connect", () => {
            this.MQTT.subscribe(this.topico_recibo);
        });
    }

    recibo_mensaje(msg) {}

    publicar_mensaje(msg) {
        this.MQTT.publish(this.topico_envio, msg);
    }
}

/*
class Comunicacion_Radar {
    apiUrl = "https://io.adafruit.com/api/v2/tiagopujia/feeds/";
    key = "aio_XEsU52K93yYgBKZvyEGNA7P9R9Bw";
    topic_1 = "radar-slash-envio-al-esp";
    topic_2 = "radar-slash-recibo-del-esp";

    constructor(){
        //this.actualizar_mensaje()
        this.recibir_mensaje()
    }

    async recibir_mensaje() {
        const url = this.apiUrl + this.topic_2 + "/data";
        const requestOptions = {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-aio-key": this.key,
            },
        };

        const response = await fetch(url, requestOptions);
        let msg = await response.json();
            msg = msg[0]

        return msg;
    }

    publicar_mensaje(msg) {
        const url = this.apiUrl + this.topic_1 + "/data";
        const requestOptions = {
            method: "POST",
            headers: {
                "x-aio-key": this.key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `value=${msg}`,
        };

        fetch(url, requestOptions)
            .then((response) => response.json())
            .then(console.log);
    }

    actualizar_mensaje(){
        setInterval(() => {
            this.recibir_mensaje()
        }, 5000);
    }

    funcion_mensaje(msg) {}
}
*/

// ============================
// ETIQUETAS
// ============================
const tag_estado = document.querySelector("#estado");
const tag_radar = document.querySelector(".radar");
const tag_btn_inicio = document.querySelector("#inicio");
const tag_btn_parar = document.querySelector("#parar");
const tag_deslizador_angulo = document.querySelector("#obtener_angulo");
const tag_btn_enviar_angulo = document.querySelector("#enviar_angulo");
const tag_mostrar_angulo = document.querySelector("#mostrar_angulo");
const tag_lista_movimiento = document.querySelector("#lista_movimientos");
const tag_ultima_actividad = document.querySelector('#ultimaActividad')

// ============================
// DEFINIR CLASES
// ============================
const classRadar = new Radar(tag_radar);
const classComunicacion = new Comunicacion_Radar();

// ============================
// LOGICA
// ============================

classComunicacion.recibo_mensaje = (msg) => {
    if (msg.includes("radar_fijo")) {
        msg = msg.slice(11);
        classRadar.data = "11";
        tag_lista_movimiento.innerHTML = classRadar.angulo_fijo + "°";
    } else if (msg.includes("radar")) {
        msg = msg.slice(6);
        classRadar.data = msg;
        tag_lista_movimiento.innerHTML = msg
            .split("")
            .map((el, i) => (el == "1" ? i + "°" : null))
            .filter((el) => el !== null)
            .join(", ");
    } else if (msg.includes("estado")) {
        msg = msg.slice(7);
        tag_estado.innerHTML = msg;

        if (msg.includes("Control Angulo Fijo")) {
            msg = msg.slice(20);
            classRadar.angulo_fijo = msg;
        } else {
            classRadar.angulo_fijo = null;
        }
    }
};

tag_btn_inicio.addEventListener("mouseup", () => {
    classComunicacion.publicar_mensaje("estado:Control Total");
});
tag_btn_parar.addEventListener("mouseup", () => {
    classComunicacion.publicar_mensaje("estado:Deshabilitar");
});
tag_btn_enviar_angulo.addEventListener("mouseup", () => {
    classComunicacion.publicar_mensaje(`estado:Control Angulo Fijo=${tag_deslizador_angulo.value}`);
});
tag_deslizador_angulo.addEventListener("input", (tag) => {
    tag_mostrar_angulo.innerHTML = tag_deslizador_angulo.value;
});

tag_mostrar_angulo.innerHTML = tag_deslizador_angulo.value;
classComunicacion.publicar_mensaje("estado actual")