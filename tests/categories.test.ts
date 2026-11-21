import { describe, expect, it } from 'vitest';
import {
  CATEGORY_KEYS,
  classifyEntryCategories,
} from '../scripts/lib/categories.mjs';

describe('Thematic Maldivian bilingual category classifier', () => {
  it('exposes all 12 curated Maldivian categories', () => {
    expect(CATEGORY_KEYS).toHaveLength(12);
    expect(CATEGORY_KEYS).toEqual([
      'maritime',
      'marine',
      'flora',
      'food',
      'weather',
      'wildlife',
      'body_health',
      'culture_religion',
      'arts_games',
      'home_crafts',
      'clothing',
      'people_emotions',
    ]);
  });

  it('classifies canonical words across all 12 Maldivian topics', () => {
    expect(
      classifyEntryCategories({
        h: 'ދޯނި',
        s: ['ވަކި ކިއްސަރަކަށް ބަނދެފައި ހުންނަ އުޅަނދެއް.'],
        eg: 'dhoni, boat',
        em: 'A traditional Maldivian sailing or motorized vessel.',
      })
    ).toContain('maritime');

    expect(
      classifyEntryCategories({
        h: 'ކަޅުބިލަމަސް',
        s: ['ކަނޑުމަހުގެ ބާވަތެއް.'],
        eg: 'skipjack tuna',
        em: 'A pelagic species of tuna central to Maldivian pole-and-line fishing.',
      })
    ).toContain('marine');

    expect(
      classifyEntryCategories({
        h: 'ކުރުނބާ',
        s: ['ދިވެހިރުކުގެ ކިހާކާއި ގަބުޅިޔާ ދެމެދުގެ ވައް.'],
        eg: 'young coconut',
        em: 'A tender young coconut filled with sweet water.',
      })
    ).toContain('flora');

    expect(
      classifyEntryCategories({
        h: 'ގަރުދިޔަ',
        s: ['ފެނުތެރެއަށް މަސްއަޅައި ލޮނު ހެޔޮވަރުކޮށްގެން ކައްކާ ދިޔަ.'],
        eg: 'garudhiya, fish broth',
        em: 'Traditional clear Maldivian fish broth.',
      })
    ).toContain('food');

    expect(
      classifyEntryCategories({
        h: 'ނަކަތް',
        s: ['މޫސުމުގެ ގޮތުން އަހަރު ބެހިފައިވާ އަށާވީސް ބައިން ބައެއް.'],
        eg: 'nakshatra, lunar mansion',
        em: 'One of the 28 seasonal divisions of the Maldivian monsoon calendar.',
      })
    ).toContain('weather');

    expect(
      classifyEntryCategories({
        h: 'ކިރުދޫނި',
        s: ['އައިނާ އަޅާ ދޫންޏެއް.'],
        eg: 'tern, seabird',
        em: 'A white seabird that hovers over schools of baitfish.',
      })
    ).toContain('wildlife');

    expect(
      classifyEntryCategories({
        h: 'ދިވެހިބޭސް',
        s: ['ޙަކީމީ ބޭހަށް ދިވެހިން ކިޔާގޮތް.'],
        eg: 'traditional medicine',
        em: 'Traditional Maldivian herbal medicine (dhivehi beys).',
      })
    ).toContain('body_health');

    expect(
      classifyEntryCategories({
        h: 'ނަމާދު',
        s: ['ޚާއްޞަވެގެންވާ ޝަރުޠުތަކަކާ ލައިގެން އަދާކުރާ އަޅުކަމެއް.'],
        eg: 'prayer, salah',
        em: 'Islamic ritual prayer.',
      })
    ).toContain('culture_religion');

    expect(
      classifyEntryCategories({
        h: 'ބޮޑުބެރު',
        s: ['ކާސިމަޖާގައި ޖަހާބެރު.'],
        eg: 'boduberu, big drum',
        em: 'Traditional Maldivian drumming and dance performance.',
      })
    ).toContain('arts_games');

    expect(
      classifyEntryCategories({
        h: 'ތުނޑުކުނާ',
        s: ['ތުނޑުބައި އަޅައިގެން ވިޔެފައި ހުންނަ ދިވެހި ކުނާ.'],
        eg: 'thundukunaa, woven mat',
        em: 'Traditional hand-woven Maldivian reed mat.',
      })
    ).toContain('home_crafts');

    expect(
      classifyEntryCategories({
        h: 'ލިބާސް',
        s: ['އިންސާނުންގެ ހަށިގަނޑު ނިވާކުރުމަށް ލައިއުޅޭ ހެދުން.'],
        eg: 'dress, garment, attire',
        em: 'Traditional Maldivian dress adorned with kasabu embroidery.',
      })
    ).toContain('clothing');

    expect(
      classifyEntryCategories({
        h: 'ލޯބި',
        s: ['ކުލުނު.'],
        eg: 'love, affection, fondness',
        em: 'Warm affection and love toward someone.',
      })
    ).toContain('people_emotions');
  });

  it('excludes single Thaana alphabet letters and guards false positives', () => {
    expect(
      classifyEntryCategories({
        h: 'ހ',
        s: ['ތާނައިގެ ފުރަތަމަ އަކުރު.'],
        eg: 'Thaana letter Haa, haa, letter',
        em: 'Thaana letter Haa (1st letter of the Thaana alphabet).',
      })
    ).toEqual([]);

    // ހަނދާންވުން (remember) must not match ހަނދު (moon / weather)
    expect(
      classifyEntryCategories({
        h: 'ހަނދާންވުން',
        s: ['ހިތަށް އެރުން.'],
        eg: 'remember, recall',
        em: 'To come to mind; to recall or remember.',
      })
    ).not.toContain('weather');

    // އުވައޮޑި (lime trough) must not match citrus lime (flora)
    expect(
      classifyEntryCategories({
        h: 'އުވައޮޑި',
        s: ['އުވަ ދޮންނަން ހަދާފައި ހުންނަ ލަކުޑި އާލަތެއް.'],
        eg: 'lime trough',
        em: 'A long boat-shaped wooden box used for mixing lime.',
      })
    ).not.toContain('flora');

    // އެއްވަރުވުން (become equal, match) must not match sports match (arts_games)
    expect(
      classifyEntryCategories({
        h: 'އެއްވަރުވުން',
        s: ['ތަފާތެއް ނެތި ހަމަހަމަވުން.'],
        eg: 'become equal, match, level',
        em: 'To become equal; to have no difference.',
      })
    ).not.toContain('arts_games');
  });
});
