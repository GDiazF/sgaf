import React from 'react';
import { FileText, Shield, Lock, Scale } from 'lucide-react';

const LegalPage = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <Scale className="w-8 h-8 text-slate-800" />
        <h1 className="text-2xl font-bold text-slate-800">Marco Legal y Normativo</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start space-x-4 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ley 17.336 sobre Propiedad Intelectual</h2>
            <p className="text-sm text-slate-600 mt-1">
              El Sistema de Gestión Administrativa y Financiera (SGAF) es de uso institucional. Este sistema hace uso de bibliotecas de software de código abierto bajo licencias permisivas (MIT, BSD, Apache 2.0). Todo el código fuente desarrollado específicamente para la institución está protegido por las normativas de propiedad intelectual. Queda prohibida la reproducción no autorizada, distribución o modificación del código fuente sin autorización expresa.
            </p>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 flex items-start space-x-4 hover:bg-slate-50 transition-colors">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ley 21.719 sobre Protección de Datos Personales</h2>
            <p className="text-sm text-slate-600 mt-1">
              La plataforma recopila, procesa y almacena datos personales de funcionarios y proveedores en estricto cumplimiento del principio de licitud y finalidad. Como titular de sus datos, usted puede ejercer sus derechos ARCO a través de los canales institucionales. La información solo se utilizará para los fines administrativos previstos y no será compartida con terceros sin consentimiento explícito.
            </p>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 flex items-start space-x-4 bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ley 21.663 Ley Marco sobre Ciberseguridad</h2>
            <p className="text-sm text-slate-600 mt-1">
              El sistema ha sido diseñado integrando controles de ciberseguridad para proteger la confidencialidad, integridad y disponibilidad de la información. Todos los incidentes, vulnerabilidades o anomalías detectadas deben ser reportadas al equipo de TI para su gestión y contención inmediata.
            </p>
          </div>
        </div>

        <div className="p-6 flex items-start space-x-4 hover:bg-slate-50 transition-colors">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ley 21.459 sobre Delitos Informáticos</h2>
            <p className="text-sm text-slate-600 mt-1">
              Para garantizar la seguridad y trazabilidad, todas las acciones en la plataforma (lectura, creación, modificación o eliminación) quedan registradas en una bitácora de auditoría inalterable que incluye su identidad, dirección IP y dispositivo utilizado. El acceso ilícito, manipulación o sabotaje constituyen delitos penados por la ley.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
