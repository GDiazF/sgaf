import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import { Info } from 'lucide-react';

const PROVIDER_INPUT_CLASS =
    'no-global !w-full !h-10 !min-h-10 !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-0 !rounded-xl !outline-none focus:!border-blue-500 uppercase !transition-all !shadow-sm placeholder:!text-slate-300';

const PROVIDER_TEXTAREA_CLASS =
    'no-global !w-full !text-[10px] !font-bold !bg-white !border !border-slate-200 !px-3 !py-2 !rounded-xl !outline-none focus:!border-blue-500 uppercase !transition-all !shadow-sm placeholder:!text-slate-300 resize-none';

const PROVIDER_SELECT_CLASS =
    "no-global !w-full !h-10 !min-h-10 !text-[10px] !font-black uppercase tracking-widest !px-3 !py-0 !rounded-xl !border !border-slate-200 !outline-none cursor-pointer appearance-none !bg-white !text-slate-700 focus:!border-blue-500 !shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

const PROVIDER_LABEL_CLASS =
    '!block !text-[10px] !font-black !text-slate-500 !uppercase !tracking-widest !mb-1.5 !ml-1';

const SectionHeader = ({ children }) => (
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
        {children}
    </h4>
);

const ProviderModal = ({
    isOpen,
    onClose,
    onSave,
    editingId,
    initialData,
    lookups: { providerTypes }
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        rut: '',
        acronimo: '',
        tipo_proveedor: '',
        contacto: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleFormSave = () => {
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleFormSave}
            title={editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            subtitle="Registre las empresas prestadoras de servicios básicos o críticos"
            saveLabel={editingId ? 'Actualizar Empresa' : 'Registrar Empresa'}
        >
            <div className="space-y-8">
                {/* Identification */}
                <div className="space-y-4">
                    <SectionHeader>Información Corporativa</SectionHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput
                            label="Razón Social / Nombre Fantasía"
                            required
                            placeholder="Ej: Compañía General de Electricidad S.A."
                            className="md:col-span-2"
                            value={formData.nombre}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            labelClassName={PROVIDER_LABEL_CLASS}
                            inputClassName={PROVIDER_INPUT_CLASS}
                        />
                        <FormInput
                            label="RUT Empresa"
                            placeholder="Ej: 76.123.456-7"
                            value={formData.rut}
                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                            labelClassName={PROVIDER_LABEL_CLASS}
                            inputClassName={PROVIDER_INPUT_CLASS}
                        />
                        <FormInput
                            label="Acrónimo / Sigla (Nemotécnico)"
                            placeholder="Ej: CGE, AGUAS_ALTO"
                            value={formData.acronimo}
                            onChange={e => setFormData({ ...formData, acronimo: e.target.value })}
                            labelClassName={PROVIDER_LABEL_CLASS}
                            inputClassName={PROVIDER_INPUT_CLASS}
                        />
                    </div>
                </div>

                {/* Categorization */}
                <div className="space-y-4">
                    <SectionHeader>Categorización de Servicio</SectionHeader>
                    <FormSelect
                        label="Giro / Tipo de Proveedor"
                        value={formData.tipo_proveedor}
                        onChange={e => setFormData({ ...formData, tipo_proveedor: e.target.value })}
                        options={providerTypes.map(t => ({ value: t.id, label: `${t.nombre} (${t.acronimo_nemotecnico})` }))}
                        placeholder="Seleccione el tipo de servicio..."
                        labelClassName={PROVIDER_LABEL_CLASS}
                        inputClassName={PROVIDER_SELECT_CLASS}
                    />
                </div>

                {/* Contact */}
                <div className="space-y-4">
                    <SectionHeader>Información de Contacto</SectionHeader>
                    <FormInput
                        label="Datos de Contacto y Dirección"
                        placeholder="Dirección comercial, teléfonos, ejecutivos de cuenta..."
                        value={formData.contacto}
                        onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                        multiline
                        rows="2"
                        labelClassName={PROVIDER_LABEL_CLASS}
                        inputClassName={PROVIDER_TEXTAREA_CLASS}
                    />
                </div>

                {/* Helper */}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        El acrónimo se utilizará en las visualizaciones compactas y reportes internos. Asegúrese de que sea fácil de identificar.
                    </p>
                </div>
            </div>
        </BaseModal>
    );
};

export default ProviderModal;
