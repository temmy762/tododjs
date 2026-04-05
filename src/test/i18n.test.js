import { describe, it, expect } from 'vitest';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

describe('i18n translations', () => {
  const getKeys = (obj, prefix = '') =>
    Object.entries(obj).flatMap(([k, v]) =>
      typeof v === 'object' ? getKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
    );

  const enKeys = getKeys(en);
  const esKeys = getKeys(es);

  it('English has all expected top-level sections', () => {
    const sections = Object.keys(en);
    expect(sections).toContain('nav');
    expect(sections).toContain('auth');
    expect(sections).toContain('common');
    expect(sections).toContain('subscription');
    expect(sections).toContain('tracks');
    expect(sections).toContain('profile');
    expect(sections).toContain('downloadHistory');
    expect(sections).toContain('deviceMgmt');
  });

  it('Spanish has all English top-level sections', () => {
    const enSections = Object.keys(en);
    const esSections = Object.keys(es);
    const missing = enSections.filter(s => !esSections.includes(s));
    expect(missing).toEqual([]);
  });

  it('Spanish covers all English keys', () => {
    const missing = enKeys.filter(k => !esKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('no empty string values in English', () => {
    const empty = enKeys.filter(k => {
      const parts = k.split('.');
      let val = en;
      for (const p of parts) val = val[p];
      return val === '';
    });
    expect(empty).toEqual([]);
  });
});
