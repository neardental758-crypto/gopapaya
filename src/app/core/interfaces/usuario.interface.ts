export interface Usuario {
  _id: string;
  empresa_id: string;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'admin';
  empresa_ids: string[];
}

export interface LoginResponse {
  status: number;
  data: Usuario;
  token: string;
  message: string;
}
