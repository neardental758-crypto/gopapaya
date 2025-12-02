export interface Tematica {
  _id: string;
  nombre_tematica: string;
  logo_tematica?: string;
  tematica_activa?: boolean;
  contenidos?: Contenido[];
  descripcion?: string;
}

export interface Contenido {
  _id: string;
  id_tematica: string;
  nombre_contenido: string;
  link_video?: string;
  num_preguntas?: number;
  preguntas?: Pregunta[];
}

export interface Pregunta {
  _id: string;
  id_contenido: string;
  texto_pregunta: string;
  respuestas?: Respuesta[];
}

export interface Respuesta {
  _id: string;
  id_pregunta: string;
  texto_respuesta: string;
  es_correcta: boolean;
}
