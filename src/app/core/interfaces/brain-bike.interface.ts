export interface Pregunta {
  _id: string;
  id_contenido: string;
  texto_pregunta: string;
  tipo_pregunta?: string;
  orden?: number;
  respuestas?: Respuesta[];
}

export interface Respuesta {
  _id: string;
  id_pregunta: string;
  texto_respuesta: string;
  es_correcta: boolean;
  color?: string;
}

export interface ContenidoCompleto {
  _id: string;
  id_tematica: string;
  nombre_contenido: string;
  link_video: string;
  num_preguntas: number;
  preguntas?: Pregunta[];
}

export interface EstadoJuego {
  preguntaActual: number;
  totalPreguntas: number;
  tiempoRestante?: number;
  fase: 'video' | 'trivia' | 'podio';
}

export interface RespuestaParticipante {
  idParticipante: number;
  idPregunta: string;
  idRespuesta: string;
  tiempoRespuesta: number;
  esCorrecta: boolean;
}
