export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          ciudad: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          correo: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          documento: string
          documentos: Json
          id: string
          licencia: string | null
          licencia_vencimiento: string | null
          nombre: string
          observaciones: string | null
          pais: string | null
          telefono: string | null
          tipo_documento: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ciudad?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          correo?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          documento: string
          documentos?: Json
          id?: string
          licencia?: string | null
          licencia_vencimiento?: string | null
          nombre: string
          observaciones?: string | null
          pais?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ciudad?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          correo?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          documento?: string
          documentos?: Json
          id?: string
          licencia?: string | null
          licencia_vencimiento?: string | null
          nombre?: string
          observaciones?: string | null
          pais?: string | null
          telefono?: string | null
          tipo_documento?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracion_empresa: {
        Row: {
          correo: string | null
          created_at: string
          direccion: string | null
          id: string
          impuesto_porcentaje: number
          logo_url: string | null
          moneda_principal: Database["public"]["Enums"]["moneda_tipo"]
          nombre: string
          ruc: string | null
          sitio_web: string | null
          telefono: string | null
          terminos_contrato: string | null
          updated_at: string
        }
        Insert: {
          correo?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          impuesto_porcentaje?: number
          logo_url?: string | null
          moneda_principal?: Database["public"]["Enums"]["moneda_tipo"]
          nombre?: string
          ruc?: string | null
          sitio_web?: string | null
          telefono?: string | null
          terminos_contrato?: string | null
          updated_at?: string
        }
        Update: {
          correo?: string | null
          created_at?: string
          direccion?: string | null
          id?: string
          impuesto_porcentaje?: number
          logo_url?: string | null
          moneda_principal?: Database["public"]["Enums"]["moneda_tipo"]
          nombre?: string
          ruc?: string | null
          sitio_web?: string | null
          telefono?: string | null
          terminos_contrato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          created_at: string
          fecha: string
          id: string
          numero: string
          pdf_url: string | null
          renta_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          numero?: string
          pdf_url?: string | null
          renta_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          numero?: string
          pdf_url?: string | null
          renta_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_renta_id_fkey"
            columns: ["renta_id"]
            isOneToOne: false
            referencedRelation: "rentas"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecciones: {
        Row: {
          combustible_porcentaje: number
          created_at: string
          danos: string | null
          fecha: string
          firma_url: string | null
          fotos: Json
          id: string
          kilometraje: number
          observaciones: string | null
          renta_id: string
          tipo: Database["public"]["Enums"]["inspeccion_tipo"]
        }
        Insert: {
          combustible_porcentaje?: number
          created_at?: string
          danos?: string | null
          fecha?: string
          firma_url?: string | null
          fotos?: Json
          id?: string
          kilometraje?: number
          observaciones?: string | null
          renta_id: string
          tipo: Database["public"]["Enums"]["inspeccion_tipo"]
        }
        Update: {
          combustible_porcentaje?: number
          created_at?: string
          danos?: string | null
          fecha?: string
          firma_url?: string | null
          fotos?: Json
          id?: string
          kilometraje?: number
          observaciones?: string | null
          renta_id?: string
          tipo?: Database["public"]["Enums"]["inspeccion_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "inspecciones_renta_id_fkey"
            columns: ["renta_id"]
            isOneToOne: false
            referencedRelation: "rentas"
            referencedColumns: ["id"]
          },
        ]
      }
      mantenimientos: {
        Row: {
          completado: boolean
          costo: number
          created_at: string
          deleted_at: string | null
          fecha: string
          id: string
          kilometraje: number | null
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          observaciones: string | null
          proximo_fecha: string | null
          proximo_km: number | null
          taller: string | null
          tipo: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          completado?: boolean
          costo?: number
          created_at?: string
          deleted_at?: string | null
          fecha: string
          id?: string
          kilometraje?: number | null
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          observaciones?: string | null
          proximo_fecha?: string | null
          proximo_km?: number | null
          taller?: string | null
          tipo: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          completado?: boolean
          costo?: number
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          kilometraje?: number | null
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          observaciones?: string | null
          proximo_fecha?: string | null
          proximo_km?: number | null
          taller?: string | null
          tipo?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      multas: {
        Row: {
          cliente_id: string | null
          created_at: string
          deleted_at: string | null
          descripcion: string
          estado: Database["public"]["Enums"]["multa_estado"]
          evidencias: Json
          fecha: string
          id: string
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          monto: number
          renta_id: string | null
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion: string
          estado?: Database["public"]["Enums"]["multa_estado"]
          evidencias?: Json
          fecha: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          monto?: number
          renta_id?: string | null
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          deleted_at?: string | null
          descripcion?: string
          estado?: Database["public"]["Enums"]["multa_estado"]
          evidencias?: Json
          fecha?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          monto?: number
          renta_id?: string | null
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_renta_id_fkey"
            columns: ["renta_id"]
            isOneToOne: false
            referencedRelation: "rentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multas_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string
          deleted_at: string | null
          estado: Database["public"]["Enums"]["pago_estado"]
          fecha: string
          id: string
          metodo: Database["public"]["Enums"]["pago_metodo"]
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          monto: number
          observaciones: string | null
          referencia: string | null
          renta_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["pago_estado"]
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["pago_metodo"]
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          monto: number
          observaciones?: string | null
          referencia?: string | null
          renta_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["pago_estado"]
          fecha?: string
          id?: string
          metodo?: Database["public"]["Enums"]["pago_metodo"]
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          monto?: number
          observaciones?: string | null
          referencia?: string | null
          renta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_renta_id_fkey"
            columns: ["renta_id"]
            isOneToOne: false
            referencedRelation: "rentas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          avatar_url: string | null
          correo: string
          created_at: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          avatar_url?: string | null
          correo: string
          created_at?: string
          id: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          avatar_url?: string | null
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rentas: {
        Row: {
          cliente_id: string
          created_at: string
          deleted_at: string | null
          deposito: number
          descuento: number
          dias: number
          estado: Database["public"]["Enums"]["renta_estado"]
          extras: number
          fecha_devolucion: string
          fecha_devolucion_real: string | null
          fecha_inicio: string
          folio: string
          id: string
          impuesto: number
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          observaciones: string | null
          subtotal: number
          tarifa: number
          total: number
          updated_at: string
          usuario_id: string | null
          vehiculo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          deleted_at?: string | null
          deposito?: number
          descuento?: number
          dias?: number
          estado?: Database["public"]["Enums"]["renta_estado"]
          extras?: number
          fecha_devolucion: string
          fecha_devolucion_real?: string | null
          fecha_inicio: string
          folio?: string
          id?: string
          impuesto?: number
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          observaciones?: string | null
          subtotal?: number
          tarifa?: number
          total?: number
          updated_at?: string
          usuario_id?: string | null
          vehiculo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          deleted_at?: string | null
          deposito?: number
          descuento?: number
          dias?: number
          estado?: Database["public"]["Enums"]["renta_estado"]
          extras?: number
          fecha_devolucion?: string
          fecha_devolucion_real?: string | null
          fecha_inicio?: string
          folio?: string
          id?: string
          impuesto?: number
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          observaciones?: string | null
          subtotal?: number
          tarifa?: number
          total?: number
          updated_at?: string
          usuario_id?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentas_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      seguros: {
        Row: {
          activo: boolean
          aseguradora: string
          cobertura: string | null
          costo: number
          created_at: string
          deleted_at: string | null
          documentos: Json
          fecha_inicio: string
          fecha_vencimiento: string
          id: string
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          numero_poliza: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          activo?: boolean
          aseguradora: string
          cobertura?: string | null
          costo?: number
          created_at?: string
          deleted_at?: string | null
          documentos?: Json
          fecha_inicio: string
          fecha_vencimiento: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          numero_poliza: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          activo?: boolean
          aseguradora?: string
          cobertura?: string | null
          costo?: number
          created_at?: string
          deleted_at?: string | null
          documentos?: Json
          fecha_inicio?: string
          fecha_vencimiento?: string
          id?: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          numero_poliza?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguros_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          anio: number
          capacidad: number | null
          categoria: string | null
          circulacion_vencimiento: string | null
          clasificacion: Database["public"]["Enums"]["vehiculo_tipo"]
          codigo: string
          color: string | null
          combustible: Database["public"]["Enums"]["combustible_tipo"] | null
          created_at: string
          deleted_at: string | null
          deposito: number
          documentos: Json
          estado: Database["public"]["Enums"]["vehiculo_estado"]
          fotos: Json
          id: string
          kilometraje: number
          marca: string
          modelo: string
          moneda: Database["public"]["Enums"]["moneda_tipo"]
          notas: string | null
          placa: string
          proximo_mantenimiento_fecha: string | null
          proximo_mantenimiento_km: number | null
          seguro_vencimiento: string | null
          tarifa_diaria: number
          tarifa_mensual: number
          tarifa_semanal: number
          tipo_vehiculo: string | null
          transmision: Database["public"]["Enums"]["transmision_tipo"] | null
          updated_at: string
          vin: string | null
        }
        Insert: {
          anio: number
          capacidad?: number | null
          categoria?: string | null
          circulacion_vencimiento?: string | null
          clasificacion?: Database["public"]["Enums"]["vehiculo_tipo"]
          codigo: string
          color?: string | null
          combustible?: Database["public"]["Enums"]["combustible_tipo"] | null
          created_at?: string
          deleted_at?: string | null
          deposito?: number
          documentos?: Json
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          fotos?: Json
          id?: string
          kilometraje?: number
          marca: string
          modelo: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          notas?: string | null
          placa: string
          proximo_mantenimiento_fecha?: string | null
          proximo_mantenimiento_km?: number | null
          seguro_vencimiento?: string | null
          tarifa_diaria?: number
          tarifa_mensual?: number
          tarifa_semanal?: number
          tipo_vehiculo?: string | null
          transmision?: Database["public"]["Enums"]["transmision_tipo"] | null
          updated_at?: string
          vin?: string | null
        }
        Update: {
          anio?: number
          capacidad?: number | null
          categoria?: string | null
          circulacion_vencimiento?: string | null
          clasificacion?: Database["public"]["Enums"]["vehiculo_tipo"]
          codigo?: string
          color?: string | null
          combustible?: Database["public"]["Enums"]["combustible_tipo"] | null
          created_at?: string
          deleted_at?: string | null
          deposito?: number
          documentos?: Json
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          fotos?: Json
          id?: string
          kilometraje?: number
          marca?: string
          modelo?: string
          moneda?: Database["public"]["Enums"]["moneda_tipo"]
          notas?: string | null
          placa?: string
          proximo_mantenimiento_fecha?: string | null
          proximo_mantenimiento_km?: number | null
          seguro_vencimiento?: string | null
          tarifa_diaria?: number
          tarifa_mensual?: number
          tarifa_semanal?: number
          tipo_vehiculo?: string | null
          transmision?: Database["public"]["Enums"]["transmision_tipo"] | null
          updated_at?: string
          vin?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "administrador"
      combustible_tipo: "gasolina" | "diesel" | "hibrido" | "electrico" | "gas"
      inspeccion_tipo: "salida" | "devolucion"
      moneda_tipo: "NIO" | "USD"
      multa_estado: "pendiente" | "pagada" | "disputada"
      pago_estado: "pendiente" | "parcial" | "pagado"
      pago_metodo: "efectivo" | "transferencia" | "tarjeta"
      renta_estado: "reservada" | "activa" | "finalizada" | "cancelada"
      transmision_tipo: "manual" | "automatica"
      vehiculo_estado:
        | "disponible"
        | "rentado"
        | "reservado"
        | "mantenimiento"
        | "fuera_servicio"
      vehiculo_tipo: "propio" | "subrentado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "administrador"],
      combustible_tipo: ["gasolina", "diesel", "hibrido", "electrico", "gas"],
      inspeccion_tipo: ["salida", "devolucion"],
      moneda_tipo: ["NIO", "USD"],
      multa_estado: ["pendiente", "pagada", "disputada"],
      pago_estado: ["pendiente", "parcial", "pagado"],
      pago_metodo: ["efectivo", "transferencia", "tarjeta"],
      renta_estado: ["reservada", "activa", "finalizada", "cancelada"],
      transmision_tipo: ["manual", "automatica"],
      vehiculo_estado: [
        "disponible",
        "rentado",
        "reservado",
        "mantenimiento",
        "fuera_servicio",
      ],
      vehiculo_tipo: ["propio", "subrentado"],
    },
  },
} as const
