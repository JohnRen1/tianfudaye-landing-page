import type { Question } from './types'

export const QUIZ_LIMIT_SECONDS = 30 * 60

export const questions: Question[] = [
  { id: 1, kind: 'choice', text: '魏晋时期“竹林七贤”之一的____在《乐论》中曾说“心气和洽，则风俗齐一。”', options: ['阮籍', '嵇康', '阮咸', '向秀'], answer: 0, note: '说这句话的是阮籍。' },
  { id: 2, kind: 'choice', text: '年夜饭非常丰盛，荤菜素菜摆满饭桌。江山许多乡村有三样菜不可少，第一碗是____。', options: ['豆腐干', '豆腐脑', '豆腐渣', '豆腐圆'], answer: 2, note: '第一碗是豆腐渣。' },
  { id: 3, kind: 'choice', text: '中元节不能少的是一碟____。', options: ['鸡', '牛', '鱼', '马'], answer: 3, note: '中元节不能少的是一碟马。' },
  { id: 4, kind: 'choice', text: '____年，麻糍节列入《江山市首批非物质文化遗产名录》。', options: ['2006', '2007', '2008', '2009'], answer: 1, note: '列入名录的年份是2007年。' },
  { id: 5, kind: 'choice', text: '每年的____，斋会负责人即组织人员和乐队沐浴、净衣后，进老佛岩迎接吴佛及寿祖佛（吴佛之娘舅）到张村祀奉。', options: ['六月初八', '六月初九', '六月初十', '六月十一'], answer: 2, note: '迎接吴佛的日子是六月初十。' },
  { id: 6, kind: 'choice', text: '新建猪栏时，在新栏门上挂____，以示吉利。', options: ['五彩布条', '七彩布条', '三彩布条', '九彩布条'], answer: 0, note: '新栏门上挂五彩布条。' },
  { id: 7, kind: 'choice', text: '公众约定某地农历某日为“墟日”，一般是每隔____一墟，各地尽量错开。', options: ['三天', '五天', '十天', '十五天'], answer: 1, note: '一般每隔五天一墟。' },
  { id: 8, kind: 'choice', text: '雕匠对雕刻题材很讲究，以牡丹与玉兰花、____组合表“玉堂富贵”。', options: ['栀子花', '秋海棠', '杜鹃花', '海棠花'], answer: 3, note: '与牡丹、玉兰花组合的是海棠花。' },
  { id: 9, kind: 'choice', text: '裁缝的祖师是____。', options: ['轩辕', '颛顼', '神农', '女娲'], answer: 0, note: '裁缝的祖师是轩辕。' },
  { id: 10, kind: 'choice', text: '____是旧时农村家家户户都要编、用的搧凉工具。', options: ['麦秆扇', '团扇', '折扇', '羽扇'], answer: 0, note: '家家户户编、用的是麦秆扇。' },
  { id: 11, kind: 'choice', text: '旧时的小孩子要戴小手镯、脚镯、项箍、挂银锁等，认为用金银箍牢，可使小孩____。', options: ['吉祥', '如意', '平安', '富贵'], answer: 2, note: '箍牢是为了让小孩平安。' },
  { id: 12, kind: 'choice', text: '建房得先选好地基，最好选择靠山近水、避风干燥处。风水先生根据家庭主要成员的生展八字，建房年月的干支、地形的特点，规定在东、南、西方向偏几度角，一般是朝南偏东一点点。首先是大地段的选定，要求高耸，明堂藏风蓄气，水口紧锁，____跳跃，____昂首，____俯伏，总之周围的山都不能给人以压迫感。', options: ['朱雀 玄武 青龙 白虎', '玄武 朱雀 青龙 白虎', '朱雀 玄武 白虎 青龙', '玄武 朱雀 白虎 青龙'], answer: 1, note: '对应顺序是玄武、朱雀、青龙、白虎。' },
  { id: 13, kind: 'choice', text: '江山水道唯有____。', options: ['碗窑水库', '模溪淤', '须江', '江山港'], answer: 3, note: '江山水道唯有江山港。' },
  { id: 14, kind: 'choice', text: '旧时嫁女比较重视嫁妆，因为嫁妆多少常常决定女儿在夫家的地位，一般到了十二三岁就开始用形似修蜓的小竹器旋转捻棉纱织带，用苎麻织布线。带，分阔带和狭带两种，织有正字或囍字图案；布线，分大布线和____。', options: ['粗布线', '细布线', '金线', '银线'], answer: 1, note: '布线分大布线和细布线。' },
  { id: 15, kind: 'choice', text: '邻里间称婶娘她娌辈往往以其____冠之，如“溪滩娘”“航头娘”“江山县娘”“西安娘”等。', options: ['娘家地名', '夫家地名', '夫家姓氏', '本人姓氏'], answer: 0, note: '称呼前冠的是娘家地名。' },
  { id: 16, kind: 'choice', text: '长寿面旧时是用索面做成。____早晨一定要吃一碗长寿面。', options: ['平常生日', '五十大寿', '正月初一', '大年三十'], answer: 2, note: '正月初一早晨要吃长寿面。' },
  { id: 17, kind: 'choice', text: '族规家训中，大多有孝顺父母、____、戒奢华、戒赌博等条例，不仅前人严格遵守，不得违反，而且今人也得以传承。', options: ['踏实上进', '温良恭俭', '戒骄戒躁', '勤耕勤读'], answer: 3, note: '条例中有勤耕勤读。' },
  { id: 18, kind: 'choice', text: '拜年要包长方形的“____”，就是把食物包起来。', options: ['油纸包', '宣纸包', '布包', '草纸包'], answer: 3, note: '包食物用的是草纸包。' },
  { id: 19, kind: 'choice', text: '____是全江山最流行最普遍最通俗的酒令。', options: ['么三', '击鼓传花', '飞花令', '唱歌'], answer: 0, note: '最通俗的酒令是么三。' },
  { id: 20, kind: 'choice', text: '一般在私塾学堂及学童家中安有____神位。', options: ['文曲星', '孔子', '文昌帝君', '文殊菩萨'], answer: 1, note: '学堂里安的是孔子神位。' },
  { id: 21, kind: 'choice', text: '广渡手狮舞是把竹篾纸扎的活动狮子模型安装在两根木棍上端，由表演者一人手持木棍下端，作伸屈、翻腾、跳跃诸股模仿狮子形体动作的一种民间舞蹈，相传唐乾符五年（878），由黄巢义军传入，广渡村张家地方一直把这一民间艺术传承下来。主要表演动作有“双狮出水、滚狮、盘柱、飞狮、____”等。', options: ['河东狮吼', '狮虎相争', '双狮回笼', '双狮戏珠'], answer: 2, note: '表演动作中有双狮回笼。' },
  { id: 22, kind: 'choice', text: '茶灯戏是江山市第一批非物质文化遗产保护项目，是花灯的一种，外皮由纸或者绢构成，骨架通常用竹条制作，其表演形式集歌舞、杂耍于一体，多方面反映社会生活。节目有卖花线、____、孟姜女、大补缸、十八摸、看相等。', options: ['走广东', '走广西', '走山东', '走山西'], answer: 0, note: '节目中有走广东。' },
  { id: 23, kind: 'choice', text: '小孩出门到外公外婆或亲戚家时，要把小孩额头或鼻尖涂上一点____。回来时也要，意指小孩出门平安。', options: ['灰色煤灰', '灰色锅灰', '黑色煤灰', '黑色锅灰'], answer: 3, note: '涂的是黑色锅灰。' },
  { id: 24, kind: 'choice', text: '____要用石灰撒端角、墙根和家具脚，叫做“杀蜈蚣禽兽”，一边撒一边说：“撒什么，撒蜈蚣：撒什么，撒禽兽；蜈蚣莫爬高，爬高斩你腰”。', options: ['春节', '端午节', '清明节', '立冬'], answer: 1, note: '这个习俗在端午节。' },
  { id: 25, kind: 'choice', text: '公鸡叫，叽咕响，张开眼，天大亮。妈妈爬起烧面汤，婆婆爬起煮蛋香，公公爬起开银箱。爸爸爬起去上山，姐姐爬起绣鸳鸯，哥哥爬起____。弟弟爬起上学堂。小宝宝，懒洋洋，还是睡在摇篮上。', options: ['下田地', '打铁花', '做文章', '打稻谷'], answer: 2, note: '哥哥爬起做文章。' },
  { id: 26, kind: 'choice', text: '嚼过状元饼（____），轻松登山顶；吃过状元粽（赤豆粽），挑担不觉重；喝过状元茶（____），天空升彩霞；饮过状元酒（高梁酒），身体年年好；尝过状元粿（芋杆粿），全村家家和；咬过状元糕（____），生活步步高；品过状元花（____），做事人人夸；赴过状元宴（酒席宴），堂前飞喜燕。', options: ['糯米饼 雨前茶 芝麻糕 番薯花', '雨前饼 糯米茶 番薯糕 芝麻花', '芝麻饼 雨前茶 糯米糕 番薯花', '番薯饼 芝麻茶 雨前糕 糯米花'], answer: 2, note: '依次是芝麻饼、雨前茶、糯米糕、番薯花。' },
  { id: 27, kind: 'choice', text: '西天佛祖来看歌，保佑大家得平安。上界神仙来看灯，保佑黎民万事兴。____来看灯，保佑弟子发黄金。山神土地来看灯，保佑五谷都丰登。上神看灯看得全，保佑下界大吉年。上神看灯看得欢，一年四季保平安。', options: ['灶司菩萨', '财神老爷', '关公大圣', '二郎真君'], answer: 0, note: '这一句说的是灶司菩萨。' },
  { id: 28, kind: 'choice', text: '正月甘蔗节节甘，二月____二头黄。三月安株摇钱树，四月枇杷一树黄。五月杨梅红一半，六月莲子满池塘。七月山楂红一半，八月葡萄挂叮荡。九月大栗上街买，十月香泡可以尝。十一月橘子满树红，十二月荔枝桂圆凑成双。', options: ['西柚', '橄榄', '草莓', '脐橙'], answer: 1, note: '二月橄榄二头黄。' },
  { id: 29, kind: 'choice', text: '____吹箫，泥皮晒焦。久晴雀噪雨，久雨雀噪晴。', options: ['蚂蚁', '泥鳅', '蜻蜓', '蚯蚓'], answer: 3, note: '吹箫的是蚯蚓。' },
  { id: 30, kind: 'choice', text: '白布下染缸——____。', options: ['碗窑', '清溪', '清湖', '清漾'], answer: 2, note: '谐音所指是清湖。' },
  { id: 31, kind: 'judge', text: '岁时节令风俗是人们在社会生活中约定俗成的一种集体性活动，显示了我们祖先对自然运动和社会发展的认识和把握。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 32, kind: 'judge', text: '神荼位于右边门扇上，身着斑驳战甲，手执黑色战戢，面容威严，姿态神武。郁垒位于左边门扇上，一袭金色战袍，神情闲逸自适。', options: ['正确', '错误'], answer: 1, note: '这一说法错误。' },
  { id: 33, kind: 'judge', text: '农业耕作视土质、水利、阳光不同而定，山垄田一年种三熟，畈田可种一熟或二熟。', options: ['正确', '错误'], answer: 1, note: '这一说法错误。' },
  { id: 34, kind: 'judge', text: '从师年龄因业而异，木匠、泥水、铁匠等活较重，需要十六七岁才能从师；篾匠要蹲功，人小骨头软，十三四岁从师最好。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 35, kind: 'judge', text: '过年过节用的米粿印图案由长条形的鱼或梅花的图案组成，表示幸福美满。', options: ['正确', '错误'], answer: 1, note: '这一说法错误。' },
  { id: 36, kind: 'judge', text: '独棵樟树一般称樟树老娘，两棵在一起的就称老爷老娘。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 37, kind: 'judge', text: '《秀峰黄宗祠香饼记》叙述发放香饼的意义：表示人义、礼节、尊重、贤良。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 38, kind: 'judge', text: '广渡舞龙灯，廿八都自古以来就有舞龙灯的习俗，油漆师傅毛殿位、毛殿贤兄弟俩，有一套会扎会画又会舞龙灯之技。', options: ['正确', '错误'], answer: 1, note: '这一说法错误。' },
  { id: 39, kind: 'judge', text: '夏天中暑或冬天感冒，用碗或梳子背放在病人背部两侧自上而下用力刮，见发红有淤血点为止，可使全身发热出汗而达到舒筋活血的效果。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 40, kind: 'judge', text: '月光姐，拜拜你，梳头洗面下来嬉。下来嬉，拾苦槠。苦槠苦，买猪肚。猪肚烂，买柴炭。柴炭乌，买茹菇。茹菇溻，买野鸭。野鸭飞下田，抲得一只大鳗鲶。大鳗鲶吹箫，吹到杭州，杭州坐飞机，月光姐上天嬉。', options: ['正确', '错误'], answer: 0, note: '这一说法正确。' },
  { id: 41, kind: 'blank', text: '六月廿四是____，也说是关公诞辰日。', options: [], answer: -1, answerText: '贺村庙会', note: '六月廿四是贺村庙会。' },
  { id: 42, kind: 'blank', text: '插秧江山话曰做“____”。', options: [], answer: -1, answerText: '莳田', note: '江山话把插秧叫做莳田。' },
  { id: 43, kind: 'blank', text: '雕匠对雕刻题材很讲究，以几案上放插有水仙、荷、菊、梅的花瓶表“____”。', options: [], answer: -1, answerText: '四季平安', note: '这个题材表示四季平安。' },
  { id: 44, kind: 'blank', text: '未婚的姑娘叫____。', options: [], answer: -1, answerText: '娜妮', note: '未婚的姑娘叫娜妮。' },
  { id: 45, kind: 'blank', text: '“押帖”的主要内容：一是确定做亲；二是男女相会；三是互知对方家庭；四是____；五是送喜帖（鸳鸯代书）。', options: [], answer: -1, answerText: '送聘金', note: '第四项是送聘金。' },
  { id: 46, kind: 'blank', text: '旧时，为了农田灌溉、粮食加工，以及生活用水等，要组织乡民造堰筑坝。凡造大的堰坝，要成立____，向民间发起募捐。', options: [], answer: -1, answerText: '堰坝会', note: '要成立堰坝会。' },
  { id: 47, kind: 'blank', text: '过五关又称“____”，拣5粒略圆的小鹅卵石，或用破碎的青砖头敲打成五颗小砖粒，或随便捡5粒小石子，称“五子”。', options: [], answer: -1, answerText: '调子', note: '过五关又称调子。' },
  { id: 48, kind: 'blank', text: '上横头一瞅，天官赐福。____，灰尘成簇。', options: [], answer: -1, answerText: '桌与凳一瞅', note: '下句是桌与凳一瞅。' },
  { id: 49, kind: 'blank', text: '____，逃去又逃归。', options: [], answer: -1, answerText: '江山皮石堆', note: '上句是江山皮石堆。' },
  { id: 50, kind: 'blank', text: '天上星多月不明，____，山中鸟多音不齐，海里鱼多水不清。', options: [], answer: -1, answerText: '凡间人多心不平', note: '对应的一句是凡间人多心不平。' },
]

export function normalizeBlank(value: string) {
  return value.trim().replace(/\s+/g, '')
}

export function isCorrectAnswer(question: Question, value: number | string | null | undefined) {
  if (question.kind === 'blank') {
    return typeof value === 'string' && normalizeBlank(value) === normalizeBlank(question.answerText ?? '')
  }
  return value === question.answer
}

export function correctAnswerLabel(question: Question) {
  if (question.kind === 'blank') return question.answerText ?? ''
  if (question.kind === 'judge') return question.options[question.answer] ?? ''
  return String.fromCharCode(65 + question.answer)
}

export function gradeAnswers(given: Array<number | string | null | undefined>, elapsedSeconds: number) {
  const baseDuration = Math.min(Math.max(0, Math.floor(elapsedSeconds)), QUIZ_LIMIT_SECONDS)
  const score = questions.reduce((count, question, index) => count + (isCorrectAnswer(question, given[index]) ? 1 : 0), 0)
  const wrongCount = questions.length - score
  const penaltySeconds = wrongCount * 10
  return { score, wrongCount, baseDuration, penaltySeconds, finalDuration: baseDuration + penaltySeconds }
}
