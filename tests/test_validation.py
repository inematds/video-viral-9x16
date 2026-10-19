import copy, importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('viral',Path(__file__).resolve().parents[1]/'scripts/viral.py')
v=importlib.util.module_from_spec(spec); spec.loader.exec_module(v)
class Validation(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup); self.root=Path(self.tmp.name)
  for f in ('voice.wav','music.wav','scenes.js','clip.mp4'): (self.root/f).touch()
  (self.root/'words.json').write_text(json.dumps({'words':[{'start':0,'end':1,'text':'Olá'}]}))
  self.p={'duration':2,'video':{'width':1080,'height':1920,'fps':30},'words':'words.json','scenes':'scenes.js','audio':{'narration':'voice.wav','music':'music.wav'},'base':{'sources':{'A':'clip.mp4'},'segments':[{'t0':0,'t1':2,'src':'A','mode':'1x'}]}}
 def check(self):
  p=self.root/'project.json';p.write_text(json.dumps(self.p));return v.validate(p)
 def test_valid(self): self.assertEqual(self.check()['duration'],2)
 def test_missing_media(self):
  (self.root/'clip.mp4').unlink()
  with self.assertRaisesRegex(ValueError,'Missing input'): self.check()
 def test_gap(self):
  self.p['base']['segments'][0]['t0']=.2
  with self.assertRaisesRegex(ValueError,'gap'): self.check()
 def test_duration(self):
  self.p['duration']=3
  with self.assertRaisesRegex(ValueError,'cover duration'): self.check()
 def test_empty_words(self):
  (self.root/'words.json').write_text('{"words":[]}')
  with self.assertRaisesRegex(ValueError,'empty'): self.check()
 def test_negative_word(self):
  (self.root/'words.json').write_text('{"words":[{"start":-1,"end":1,"text":"x"}]}')
  with self.assertRaisesRegex(ValueError,'timestamps'): self.check()
 def test_wrong_dimensions(self):
  self.p['video']['width']=720
  with self.assertRaisesRegex(ValueError,'1080'): self.check()
if __name__=='__main__': unittest.main()
