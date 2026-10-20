"""Create the price-free illustrated cupboard checklist from the site's inventory."""
import json,math,pathlib,shutil
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.colors import HexColor,Color
from reportlab.lib.utils import ImageReader
ROOT=pathlib.Path(__file__).resolve().parents[2]
products=json.loads((ROOT/'gift-app/src/snacks-data.json').read_text())
OUT=ROOT/'output/pdf/snack-list.pdf';OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
c=canvas.Canvas(str(OUT),pagesize=(595.28,841.89));c.setTitle('给你的零食小柜');c.setAuthor('最爱你的男朋友')
ink=HexColor('#55434d');rose=HexColor('#ac718e');muted=HexColor('#9e8b95');line=HexColor('#ebdfe5')
def txt(x,y,s,size=10,color=ink):
 c.setFillColor(color);c.setFont('STSong-Light',size);c.drawString(x,y,s.replace('·','/').replace('’',"'"))
def wrap(s,maxw,size):
 lines=[];line=''
 for a in s:
  if pdfmetrics.stringWidth(line+a,'STSong-Light',size)>maxw:lines.append(line);line=a
  else:line+=a
 if line:lines.append(line)
 return lines
cats=[('fruit','清甜果香','果香和小小的甜，留给想放松一下的你。'),('savory','咸香咔嚓','咔嚓一口，陪你度过自己的小片刻。'),('sweet','软糯与甜脆','把松软、酥脆和一点甜，都放在你手边。')]
for page,(cat,title,sub) in enumerate(cats,1):
 c.setFillColor(HexColor('#fffafd'));c.rect(0,0,595.28,841.89,fill=1,stroke=0)
 txt(37,800,'给你的零食小柜',24);txt(37,775,'给你备好了一点小零嘴。想吃的时候就拿一份，慢慢吃，慢慢开心。',10,muted)
 c.setStrokeColor(line);c.line(37,757,558,757)
 txt(37,732,title,15,rose);txt(37,713,sub,10,muted)
 selected=[p for p in products if p['category']==cat]
 for i,p in enumerate(selected):
  col=i%2;row=i//2;x=37+col*268;y=687-row*112
  c.setFillColor(HexColor('#ffffff'));c.setStrokeColor(line);c.roundRect(x,y-101,253,103,8,fill=1,stroke=1)
  c.drawImage(ImageReader(str(ROOT/'gift-app/public/snacks'/f"{p['id']}.jpg")),x+10,y-71,width=63,height=63,mask='auto',preserveAspectRatio=True,anchor='c')
  for j,t in enumerate(wrap(p['name'],157,10)):txt(x+82,y-16-j*14,t,10)
  txt(x+82,y-55,p['size'],8.5,muted)
  c.setStrokeColor(HexColor('#c9a6b8'));c.roundRect(x+83,y-82,9,9,2,stroke=1,fill=0);txt(x+98,y-81,'吃完啦',9,rose)
 c.setStrokeColor(line);c.line(37,103,558,103)
 txt(37,83,'想吃什么就慢慢挑，不用赶着吃完。',10,muted)
 txt(37,66,'愿这些小小的味道，能替我陪在你身边一会儿。',10,muted)
 txt(37,43,'最爱你的男朋友',10,rose)
 txt(495,43,f'{page} / 3',9,muted)
 c.showPage()
c.save()
shutil.copyfile(OUT,ROOT/'gift-app/public/snacks/snack-list.pdf')
print(OUT)
