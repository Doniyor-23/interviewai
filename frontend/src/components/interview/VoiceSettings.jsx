import { Volume2, VolumeX } from 'lucide-react';
import SelectField from '../forms/SelectField';
import Button from '../common/Button';
import { FormAlert } from '../common/ErrorNotice';

/** Voice output settings + honest browser-support notices. */
export default function VoiceSettings({ synth, speechOn, setSpeechOn, lang, recognitionSupported, test }) {
  const langName = lang === 'uz' ? 'Uzbek' : 'English';
  const options = [{ value: '', label: synth.matching.length ? 'Automatic (best match)' : 'Browser default' }, ...[...synth.matching, ...synth.voices.filter((v) => !synth.matching.includes(v))].map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }))];
  return (
    <div className="space-y-4">
      {!synth.supported && <FormAlert>This browser cannot read questions aloud. Questions will be shown as text only. Chrome or Edge work best.</FormAlert>}
      {synth.supported && !synth.hasVoiceForLang && <FormAlert>No {langName} voice was found in this browser, so the question may sound wrong or stay silent. Pick another voice below, or turn voice off and read the questions on screen.</FormAlert>}
      {!recognitionSupported && <FormAlert>Voice answers are not supported in this browser. Use Chrome or Edge to speak your answers; here you can type them instead.</FormAlert>}
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
