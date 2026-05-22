import { useState, useRef, useCallback } from 'react';
import { Mail, X, Send, Upload, Loader, CheckCircle, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import API_URL from '../config/api';

const INITIAL_FORM = { name: '', email: '', phone: '', subject: '', message: '', privacy: false };

export default function FloatingContact() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const addFiles = (newFiles) => {
    const valid = [];
    const rejected = [];
    Array.from(newFiles).forEach(f => {
      if (f.size > MAX_FILE_SIZE) {
        rejected.push(f.name);
      } else {
        valid.push(f);
      }
    });
    if (rejected.length) {
      setErrorMsg(`${t('contact.fileTooLarge')} ${rejected.join(', ')}`);
    }
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleClose = () => {
    if (status === 'submitting') return;
    setOpen(false);
    setTimeout(() => {
      setStatus('idle');
      setErrorMsg('');
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.privacy) {
      setErrorMsg(t('contact.privacyRequired'));
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          message: form.message,
          attachments: files.map(f => f.name),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setTimeout(() => {
          handleClose();
          setForm(INITIAL_FORM);
          setFiles([]);
        }, 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.message || t('contact.errorGeneric'));
      }
    } catch {
      setStatus('error');
      setErrorMsg(t('contact.errorNetwork'));
    }
  };

  const inputClass =
    'w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/60 transition-colors';

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-28 md:bottom-8 right-4 md:right-6 z-40 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full shadow-xl shadow-red-600/40 transition-all duration-200 hover:scale-105 font-semibold text-sm select-none"
          aria-label={t('contact.buttonLabel')}
        >
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span>{t('contact.buttonLabel')}</span>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Slide-up Panel */}
      <div
        className={`fixed bottom-0 right-0 z-50 w-full sm:w-[390px] max-h-[92vh] flex flex-col
          bg-[#0d0d0d] border-t border-l border-white/10 sm:rounded-tl-2xl shadow-2xl
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-bold text-white">{t('contact.title')}</h2>
          <button
            onClick={handleClose}
            disabled={status === 'submitting'}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success State */}
        {status === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400" />
            <h3 className="text-lg font-bold text-white">{t('contact.successTitle')}</h3>
            <p className="text-sm text-white/60">{t('contact.successMsg')}</p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">{t('contact.name')}</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder={t('contact.namePlaceholder')}
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">{t('contact.email')}</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder={t('contact.emailPlaceholder')}
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">{t('contact.phone')}</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder={t('contact.phonePlaceholder')}
                className={inputClass}
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">{t('contact.subject')}</label>
              <select
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" disabled>{t('contact.subjectPlaceholder')}</option>
                <option value="technical_support">{t('contact.subjectTechSupport')}</option>
                <option value="billing">{t('contact.subjectBilling')}</option>
                <option value="subscription">{t('contact.subjectSubscription')}</option>
                <option value="download_issue">{t('contact.subjectDownload')}</option>
                <option value="music_request">{t('contact.subjectMusicRequest')}</option>
                <option value="general">{t('contact.subjectGeneral')}</option>
                <option value="bug_report">{t('contact.subjectBugReport')}</option>
                <option value="other">{t('contact.subjectOther')}</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1.5">{t('contact.message')}</label>
              <textarea
                name="message"
                required
                value={form.message}
                onChange={handleChange}
                placeholder={t('contact.messagePlaceholder')}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* File Upload */}
            <div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                  dragging
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-white/40" />
                <p className="text-xs text-white/40">{t('contact.dropZone')}</p>
                <p className="text-[10px] text-white/25 mt-1">{t('contact.dropZoneHint')}</p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,audio/*,.pdf,.doc,.docx"
                  onChange={(e) => addFiles(e.target.files)}
                  className="hidden"
                />
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-2 py-1 bg-white/5 rounded-lg text-xs text-white/60">
                      <span className="flex items-center gap-1.5 truncate">
                        <Paperclip className="w-3 h-3 flex-shrink-0" />
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-white/30 hover:text-white/70 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="privacy"
                checked={form.privacy}
                onChange={handleChange}
                className="mt-0.5 w-3.5 h-3.5 accent-red-500 flex-shrink-0 cursor-pointer"
              />
              <span className="text-xs text-white/50 leading-relaxed">
                {t('contact.privacyText')}{' '}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('contact.privacyLink')}
                </a>
              </span>
            </label>

            {/* Error */}
            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mb-2"
            >
              {status === 'submitting' ? (
                <><Loader className="w-4 h-4 animate-spin" /> {t('contact.sending')}</>
              ) : (
                <><Send className="w-4 h-4" /> {t('contact.send')}</>
              )}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
