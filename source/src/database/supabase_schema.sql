-- ========================================================
-- Script de Base de Datos para Energy School
-- Propósito: Configurar tablas, triggers y RLS en Supabase
-- ========================================================

-- 1. TABLA: profiles
-- Almacena información adicional de los usuarios vinculada a auth.users
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'docente', 'mantenimiento', 'directivo')) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now())
);

-- 2. TABLA: salones
-- Estado actual de consumo y energía de los salones
CREATE TABLE public.salones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  estado_energia BOOLEAN DEFAULT false,
  consumo_actual FLOAT DEFAULT 0.0,
  presencia_detectada BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now())
);

-- 3. TABLA: consumo_historial
-- Historial de kilovatios para reportes
CREATE TABLE public.consumo_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salones(id) ON DELETE CASCADE,
  kilovatios FLOAT NOT NULL,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now())
);

-- ========================================================
-- AUTOMATIZACIÓN: Triggers para Perfiles de Usuario
-- ========================================================

-- Función que inserta el perfil tras el registro en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'role'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta después de cada INSERT en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================================
-- SEGURIDAD: Row Level Security (RLS)
-- ========================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumo_historial ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Usuarios pueden ver su propio perfil" 
  ON public.profiles FOR SELECT 
  USING ( auth.uid() = id );

CREATE POLICY "Usuarios pueden editar su propio nombre" 
  ON public.profiles FOR UPDATE 
  USING ( auth.uid() = id );

-- Políticas para SALONES
CREATE POLICY "Usuarios autenticados pueden ver salones"
  ON public.salones FOR SELECT
  TO authenticated
  USING ( true );

CREATE POLICY "Admin y Mantenimiento pueden controlar energía"
  ON public.salones FOR UPDATE
  TO authenticated
  USING ( 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'mantenimiento')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'mantenimiento')
    )
  );

-- Políticas para CONSUMO_HISTORIAL
CREATE POLICY "Lectura de historial para todos los autenticados"
  ON public.consumo_historial FOR SELECT
  TO authenticated
  USING ( true );

-- ========================================================
-- 4. TABLA: consumo_energia
-- Lecturas en tiempo real de los sensores PZEM-004T
-- enviadas por los ESP32 a través del puente MQTT → Supabase.
-- Separada de consumo_historial (que almacena datos agregados).
-- ========================================================
CREATE TABLE public.consumo_energia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salones(id) ON DELETE CASCADE,
  voltaje FLOAT,
  corriente FLOAT,
  potencia_w FLOAT NOT NULL,
  energia_kwh FLOAT NOT NULL,
  dispositivo TEXT CHECK (dispositivo IN ('luz', 'aire_acondicionado', 'enchufe')),
  registrado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now())
);

-- Índice para consultas frecuentes por salón y fecha
CREATE INDEX idx_consumo_energia_salon ON public.consumo_energia (salon_id, registrado_en DESC);

-- Habilitar RLS
ALTER TABLE public.consumo_energia ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados del dashboard pueden leer las lecturas
CREATE POLICY "Lectura de consumo para autenticados"
  ON public.consumo_energia FOR SELECT
  TO authenticated
  USING ( true );

-- Solo el backend (service_role) puede insertar lecturas desde el puente MQTT
CREATE POLICY "Inserción desde service_role (backend MQTT)"
  ON public.consumo_energia FOR INSERT
  TO service_role
  WITH CHECK ( true );
