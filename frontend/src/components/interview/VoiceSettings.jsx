import { Volume2, VolumeX } from 'lucide-react';
import SelectField from '../forms/SelectField';
import Button from '../common/Button';
import { FormAlert } from '../common/ErrorNotice';
import { useTranslation } from 'react-i18next';

/** Voice output settings + honest browser-support notices. */
export default function VoiceSettings({ synth, speechOn, setSpeechOn, lang, recognitionSupported, test }) {
  const { t } = useTranslation();
  const langName = t(`voiceUI.${lang === 'uz' ? 'uzbek' : lang === 'ru' ? 'russian' : 'english'}`);
  const options = [{ value: '', label: synth.matching.length ? t('voiceUI.automatic') : t('voiceUI.none') }, ...synth.matching.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }))];
  return (
    <div className="space-y-4">
      {!synth.supported && <FormAlert>{t('voiceUI.noTts')}</FormAlert>}
      {synth.supported && !synth.hasVoiceForLang && <FormAlert>{t('voiceUI.noVoice', { language: langName })}</FormAlert>}
      {lang === 'uz' && <FormAlert>{t('interview.uzbAzureSpeech')}</FormAlert>}
      {!recognitionSupported && lang !== 'uz' && <FormAlert>{t('voiceUI.unsupported')}</FormAlert>}
      {synth.supported && (
        <>
          <button type="button" onClick={() => setSpeechOn(!speechOn)} className="flex w-full items-center justify-between rounded-xl border border-line bg-ink-900/60 px-4 py-3 text-left text-sm">
            <span className="flex items-center gap-3">{speechOn ? <Volume2 size={18} className="text-brand-soft" /> : <VolumeX size={18} className="text-muted" />}{t('voiceUI.readAloud')}</span>
            <span className={speechOn ? 'font-semibold text-emerald-300' : 'text-muted'}>{speechOn ? t('voiceUI.on') : t('voiceUI.off')}</span>
          </button>
          <SelectField label={t('voiceUI.voice', { language: langName })} options={options} value={synth.voiceURI} onChange={(e) => synth.setVoiceURI(e.target.value)} disabled={!synth.voices.length} />
          <Button type="button" variant="secondary" size="sm" icon={Volume2} onClick={test}>{t('voiceUI.test')}</Button>
        </>
      )}
    </div>
  );
}
