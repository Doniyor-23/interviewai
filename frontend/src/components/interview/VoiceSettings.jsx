import { Volume2, VolumeX } from 'lucide-react';
import SelectField from '../forms/SelectField';
import Button from '../common/Button';
import { FormAlert } from '../common/ErrorNotice';
import { useTranslation } from 'react-i18next';

/** Voice output settings + honest browser-support notices. */
export default function VoiceSettings({ synth, speechOn, setSpeechOn, lang, recognitionSupported, test }) {
  const { t } = useTranslation();
  const langName = lang === 'uz' ? 'Uzbek' : lang === 'ru' ? 'Russian' : 'English';
  const options = [{ value: '', label: synth.matching.length ? 'Automatic (best match)' : 'No matching device voice' }, ...synth.matching.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }))];
  return (
    <div className="space-y-4">
      {!synth.supported && <FormAlert>This browser cannot read questions aloud. Questions will be shown as text only. Chrome or Edge work best.</FormAlert>}
      {synth.supported && !synth.hasVoiceForLang && <FormAlert>No {langName} voice is available on this device. Turn voice off and read the question shown on screen.</FormAlert>}
      {lang === 'uz' && <FormAlert>{t('interview.uzbLocalSpeech')}</FormAlert>}
      {!recognitionSupported && lang !== 'uz' && <FormAlert>Voice answers are not supported in this browser. You can type your answer instead.</FormAlert>}
      {synth.supported && (
        <>
          <button type="button" onClick={() => setSpeechOn(!speechOn)} className="flex w-full items-center justify-between rounded-xl border border-line bg-ink-900/60 px-4 py-3 text-left text-sm">
            <span className="flex items-center gap-3">{speechOn ? <Volume2 size={18} className="text-brand-soft" /> : <VolumeX size={18} className="text-muted" />}Read questions aloud</span>
            <span className={speechOn ? 'font-semibold text-emerald-300' : 'text-muted'}>{speechOn ? 'On' : 'Off'}</span>
          </button>
          <SelectField label={`Voice (${langName})`} options={options} value={synth.voiceURI} onChange={(e) => synth.setVoiceURI(e.target.value)} disabled={!synth.voices.length} />
          <Button type="button" variant="secondary" size="sm" icon={Volume2} onClick={test}>Test voice</Button>
        </>
      )}
    </div>
  );
}
