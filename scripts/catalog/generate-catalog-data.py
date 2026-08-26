#!/usr/bin/env python3
"""Generate bright-stars-v3.yaml and additional-stars.yaml from VizieR Hipparcos + BSC."""
from __future__ import annotations

import math
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path('/tmp/adastra-catalog')
OUT_BRIGHT = Path(__file__).resolve().parent / 'bright-stars-v3.yaml'
OUT_ADD = Path(__file__).resolve().parent / 'additional-stars.yaml'

CONST_CN = {
    'And': '仙女座', 'Ant': '南极座', 'Aps': '天燕座', 'Aql': '天鹰座', 'Aqr': '宝瓶座',
    'Ara': '天坛座', 'Ari': '白羊座', 'Aur': '御夫座', 'Boo': '牧夫座', 'CMa': '大犬座',
    'CMi': '小犬座', 'CVn': '猎犬座', 'Cae': '雕具座', 'Cam': '鹿豹座', 'Cap': '摩羯座',
    'Car': '船底座', 'Cas': '仙后座', 'Cen': '半人马座', 'Cep': '仙王座', 'Cet': '鲸鱼座',
    'Cha': '蝘蜓座', 'Cir': '圆规座', 'Col': '天鸽座', 'Com': '后发座', 'CrA': '南冕座',
    'CrB': '北冕座', 'Cru': '南十字座', 'Crv': '乌鸦座', 'Cyg': '天鹅座', 'Del': '海豚座',
    'Dor': '剑鱼座', 'Dra': '天龙座', 'Equ': '小马座', 'Eri': '波江座', 'For': '天炉座',
    'Gem': '双子座', 'Gru': '天鹤座', 'Her': '武仙座', 'Hor': '时钟座', 'Hya': '长蛇座',
    'Hyi': '水蛇座', 'Ind': '印第安座', 'LMi': '小狮座', 'Lac': '蝎虎座', 'Leo': '狮子座',
    'Lep': '天兔座', 'Lib': '天秤座', 'Lup': '豺狼座', 'Lyn': '天猫座', 'Lyr': '天琴座',
    'Men': '山案座', 'Mic': '显微镜座', 'Mon': '麒麟座', 'Mus': '苍蝇座', 'Nor': '矩尺座',
    'Oct': '南极座', 'Oph': '蛇夫座', 'Ori': '猎户座', 'Pav': '孔雀座', 'Peg': '飞马座',
    'Per': '英仙座', 'Phe': '凤凰座', 'Pic': '绘架座', 'PsA': '南鱼座', 'Psc': '双鱼座',
    'Pup': '船尾座', 'Pyx': '罗盘座', 'Ret': '网罟座', 'Scl': '玉夫座', 'Sct': '盾牌座',
    'Ser': '巨蛇座', 'Sex': '六分仪座', 'Sge': '天箭座', 'Sgr': '人马座', 'Tau': '金牛座',
    'Tel': '望远镜座', 'Tra': '南三角座', 'Tri': '三角座', 'Tuc': '杜鹃座', 'UMa': '大熊座',
    'UMi': '小熊座', 'Vel': '船帆座', 'Vir': '室女座', 'Vol': '飞鱼座', 'Vul': '狐狸座',
}

GREEK = {
    'Alp': 'alpha', 'Bet': 'beta', 'Gam': 'gamma', 'Del': 'delta', 'Eps': 'epsilon',
    'Zet': 'zeta', 'Eta': 'eta', 'Tet': 'theta', 'The': 'theta', 'Iot': 'iota',
    'Kap': 'kappa', 'Lam': 'lambda', 'Mu': 'mu', 'Nu': 'nu', 'Xi': 'xi', 'Omi': 'omicron',
    'Pi': 'pi', 'Rho': 'rho', 'Sig': 'sigma', 'Tau': 'tau', 'Ups': 'upsilon',
    'Phi': 'phi', 'Chi': 'chi', 'Psi': 'psi', 'Ome': 'omega',
}

# IAU proper name -> (id, chinese)
PROPER = {
    'Sirius': ('sirius', '天狼星'), 'Canopus': ('canopus', '老人星'),
    'Arcturus': ('arcturus', '大角星'), 'Vega': ('vega', '织女星'),
    'Capella': ('capella', '五车二'), 'Rigel': ('rigel', '参宿七'),
    'Procyon': ('procyon', '南河三'), 'Achernar': ('achernar', '水委一'),
    'Betelgeuse': ('betelgeuse', '参宿四'), 'Hadar': ('hadar', '马腹一'),
    'Altair': ('altair', '牛郎星'), 'Acrux': ('acrux', '十字架二'),
    'Aldebaran': ('aldebaran', '毕宿五'), 'Spica': ('spica', '角宿一'),
    'Antares': ('antares', '心宿二'), 'Pollux': ('pollux', '北河三'),
    'Fomalhaut': ('fomalhaut', '北落师门'), 'Mimosa': ('mimosa', '十字架三'),
    'Deneb': ('deneb', '天津四'), 'Regulus': ('regulus', '轩辕十四'),
    'Adhara': ('adhara', '弧矢七'), 'Castor': ('castor', '北河二'),
    'Gacrux': ('gacrux', '十字架一'), 'Shaula': ('shaula', '尾宿八'),
    'Bellatrix': ('bellatrix', '参宿五'), 'Elnath': ('elnath', '五车五'),
    'Miaplacidus': ('miaplacidus', '南船五'), 'Alnilam': ('alnilam', '参宿二'),
    'Alnitak': ('alnitak', '参宿一'), 'Alioth': ('alioth', '玉衡'),
    'Mirfak': ('mirfak', '天船三'), 'Dubhe': ('dubhe', '天枢'),
    'Wezen': ('wezen', '弧矢一'), 'Alkaid': ('alkaid', '摇光'),
    'Avior': ('avior', '海石一'), 'Sargas': ('sargas', '尾宿五'),
    'Menkalinan': ('menkalinan', '五车三'), 'Atria': ('atria', '三角形三'),
    'Alhena': ('alhena', '井宿三'), 'Peacock': ('peacock', '孔雀十一'),
    'Alphard': ('alphard', '星宿一'), 'Polaris': ('polaris', '北极星'),
    'Mirzam': ('mirzam', '军市一'), 'Hamal': ('hamal', '娄宿三'),
    'Nunki': ('nunki', '斗宿四'), 'Alpheratz': ('alpheratz', '壁宿一'),
    'Mirach': ('mirach', '奎宿九'), 'Rasalhague': ('rasalhague', '候'),
    'Algieba': ('algieba', '轩辕十二'), 'Kochab': ('kochab', '帝星'),
    'Almach': ('alamak', '天大将军一'), 'Denebola': ('denebola', '五帝座一'),
    'Algol': ('algol', '大陵五'), 'Diphda': ('denebKaitos', '土司空'),
    'Sadr': ('sadr', '天津一'), 'Caph': ('caph', '王良一'),
    'Schedar': ('schedar', '王良四'), 'Mintaka': ('mintaka', '参宿三'),
    'Mizar': ('mizar', '开阳'), 'Alphecca': ('alphecca', '贯索四'),
    'Etamin': ('etamin', '天棓四'), 'Merak': ('merak', '天璇'),
    'Izar': ('izar', '七公六'), 'Enif': ('enif', '危宿三'),
    'Phecda': ('phecda', '天玑'), 'Scheat': ('scheat', '室宿二'),
    'Aludra': ('aludra', '弧矢二'), 'Markab': ('markab', '室宿一'),
    'Menkar': ('menkar', '天囷一'), 'Zosma': ('zosma', '西上相'),
    'Saiph': ('saiph', '参宿六'), 'Albireo': ('albireo', '辇道增七'),
    'Tarazed': ('tarazed', '河鼓二'), 'Alshain': ('alshain', '河鼓三'),
    'Rasalas': ('rasElased', '轩辕十一'), 'Porrima': ('porrima', '太微右垣四'),
    'Vindemiatrix': ('vindemiatrix', '太微左垣四'), 'Kornephoros': ('kornephoros', '天市右垣一'),
    'Rastaban': ('rastaban', '天棓三'), 'Thuban': ('thuban', '右枢'),
    'Alcyone': ('alcyone', '昴宿六'), 'Electra': ('electra', '昴宿一'),
    'Atlas': ('atlas', '昴宿增'), 'Gomeisa': ('gomeisa', '南河二'),
    'Ascella': ('ascella', '斗宿六'), 'Sheratan': ('sheratan', '娄宿一'),
    'Mesarthim': ('mesarthim', '娄宿二'), 'Acubens': ('acubens', '柳宿增二'),
    'Cor Caroli': ('corCaroli', '常陈一'), 'Gienah': ('gienahCyg', '天津九'),
    'Alderamin': ('alderamin', '天钩五'), 'Errai': ('errai', '少卫增八'),
    'Zubenelgenubi': ('zubenelgenubi', '氐宿一'), 'Zubeneschamali': ('zubeneschamali', '氐宿四'),
    'Deneb Algedi': ('denebAlgedi', '垒壁阵四'), 'Dabih': ('dabih', '牛宿一'),
    'Algedi': ('algedi', '牛宿二'), 'Nashira': ('nashira', '垒壁阵三'),
    'Sadalsuud': ('sadalsuud', '虚宿一'), 'Sadalmelik': ('sadalmelik', '危宿一'),
    'Skat': ('skat', '羽林军二十六'), 'Arneb': ('arneb', '厕一'),
    'Nihal': ('nihal', '厕二'), 'Algenib': ('algenib', '壁宿二'),
    'Aspidiske': ('aspidiske', '海石二'), 'Cursa': ('cursa', '玉井三'),
    'Acamar': ('acamar', '天园六'), 'Mira': ('mira', '刍藁增二'),
    'Rigil Kentaurus': ('rigilKentaurus', '南门二'), 'Menkent': ('menkent', '库楼三'),
    'Naos': ('naos', '弧矢增二十二'), 'Regor': ('regor', '十字架增'),
    'Alnair': ('alnair', '鹤一'), 'Ankaa': ('ankaa', '天钩一'),
    'Phact': ('phact', '土公一'), 'Suhail': ('suhail', '天记一'),
    'Mirzam': ('mirzam', '军市一'), 'Meissa': ('meissa', '觜宿一'),
    'Mebsuta': ('mebsuta', '井宿五'), 'Tejat': ('tejat', '井宿二'),
    'Propus': ('propus', '井宿一'), 'Wasat': ('wasat', '井宿四'),
    'Almaaz': ('almaaz', '柱一'), 'Mahasim': ('mahasim', '五车四'),
    'Hassaleh': ('hassaleh', '五车一'), 'Ain': ('ain', '毕宿一'),
    'Alcyone': ('alcyone', '昴宿六'), 'Rigil Kent': ('rigilKentaurus', '南门二'),
}

# Extra Chinese names for Bayer stars (common 星官名)
BAYER_CN = {
    ('Ori', 'Bet'): '参宿四', ('Ori', 'Alp'): '参宿四', ('Ori', 'Gam'): '参宿二',
    ('Ori', 'Del'): '参宿三', ('Ori', 'Eps'): '参宿二', ('Ori', 'Zet'): '参宿一',
    ('Ori', 'Kap'): '参宿一', ('Ori', 'Iot'): '参宿增', ('Ori', 'Lam'): '参宿增',
    ('Ori', 'Mu'): '参宿增', ('Ori', 'Nu'): '参宿增', ('Ori', 'Xi'): '参宿增',
    ('Ori', 'Pi'): '参宿π', ('Ori', 'Chi'): '参宿χ', ('Ori', 'Eta'): '参宿增',
    ('Cen', 'Alp'): '南门二', ('Cen', 'Bet'): '马腹一', ('Cen', 'Gam'): '库楼二',
    ('Cen', 'Del'): '库楼三', ('Cen', 'Eps'): '库楼增', ('Cen', 'Eta'): '库楼增',
    ('Hya', 'Alp'): '星宿一', ('Hya', 'Gam'): '柳宿增', ('Hya', 'Sig'): '星宿增',
    ('Dra', 'Alp'): '天棓四', ('Dra', 'Bet'): '天棓三', ('Dra', 'Gam'): '天棓一',
    ('Dra', 'Del'): '天棓二', ('Dra', 'Eta'): '右枢增', ('Dra', 'Zet'): '天棓二',
    ('Eri', 'Alp'): '水委一', ('Eri', 'Bet'): '玉井三', ('Eri', 'Gam'): '天园一',
    ('Eri', 'Del'): '天园六', ('Eri', 'Eps'): '天园增', ('Eri', 'Zet'): '天园增',
    ('Her', 'Alp'): '帝座', ('Her', 'Bet'): '天市右垣一', ('Her', 'Gam'): '天市右垣二',
    ('Her', 'Del'): '天市右垣三', ('Her', 'Eps'): '天纪四', ('Her', 'Zet'): '天纪二',
    ('Her', 'Eta'): '天纪一', ('Her', 'Pi'): '天纪三', ('Her', 'Kap'): '天市右垣四',
    ('Vir', 'Alp'): '角宿一', ('Vir', 'Gam'): '角宿二', ('Vir', 'Eps'): '太微左垣四',
    ('Vir', 'Del'): '太微右垣四', ('Vir', 'Eta'): '东次将', ('Vir', 'Zet'): '角宿增',
    ('Oph', 'Alp'): '候', ('Oph', 'Bet'): '天市右垣十一', ('Oph', 'Gam'): '宗正',
    ('Oph', 'Del'): '天江', ('Oph', 'Zet'): '宋增', ('Oph', 'Eta'): '天市右垣十一',
    ('And', 'Alp'): '壁宿一', ('And', 'Bet'): '奎宿九', ('And', 'Gam'): '天大将军一',
    ('And', 'Del'): '奎宿五', ('Peg', 'Alp'): '室宿一', ('Peg', 'Bet'): '室宿二',
    ('Peg', 'Gam'): '壁宿二', ('Peg', 'Del'): '室宿增', ('Peg', 'Eta'): '室宿增',
    ('UMa', 'Alp'): '天枢', ('UMa', 'Bet'): '天璇', ('UMa', 'Gam'): '天玑',
    ('UMa', 'Del'): '天权', ('UMa', 'Eps'): '玉衡', ('UMa', 'Zet'): '开阳',
    ('UMa', 'Eta'): '摇光', ('UMa', 'Nu'): '天璇增', ('UMa', 'Xi'): '大熊ξ',
    ('Sgr', 'Gam'): '箕宿增', ('Sgr', 'Del'): '斗宿二', ('Sgr', 'Eps'): '箕宿一',
    ('Sgr', 'Zet'): '斗宿四', ('Sgr', 'Eta'): '箕宿二', ('Sgr', 'Kap'): '斗宿增',
    ('Sgr', 'Lam'): '斗宿增', ('Sgr', 'Mu'): '斗宿增', ('Sgr', 'Pi'): '斗宿三',
    ('Sgr', 'Sig'): '斗宿增', ('Sgr', 'Tau'): '斗宿增', ('Sgr', 'Phi'): '斗宿三',
    ('Cyg', 'Alp'): '天津四', ('Cyg', 'Bet'): '天津九', ('Cyg', 'Gam'): '天津一',
    ('Cyg', 'Del'): '天津二', ('Cyg', 'Eps'): '天津增', ('Cyg', 'Zet'): '天津增',
    ('Aql', 'Alp'): '牛郎星', ('Aql', 'Bet'): '河鼓二', ('Aql', 'Gam'): '河鼓三',
    ('Aql', 'Del'): '右旗三', ('Aql', 'Zet'): '天市左垣十一', ('Aql', 'Eta'): '天鹰η',
    ('Tau', 'Alp'): '毕宿五', ('Tau', 'Bet'): '五车五', ('Tau', 'Gam'): '毕宿一',
    ('Tau', 'Del'): '毕宿三', ('Tau', 'Eps'): '毕宿一', ('Tau', 'Zet'): '天关',
    ('Gem', 'Alp'): '北河二', ('Gem', 'Bet'): '北河三', ('Gem', 'Gam'): '井宿三',
    ('Gem', 'Del'): '井宿四', ('Gem', 'Eps'): '井宿五', ('Gem', 'Mu'): '井宿增',
    ('Gem', 'Nu'): '井宿增', ('Gem', 'Xi'): '井宿增', ('Gem', 'Eta'): '井宿二',
    ('Leo', 'Alp'): '轩辕十四', ('Leo', 'Bet'): '五帝座一', ('Leo', 'Gam'): '轩辕十二',
    ('Leo', 'Del'): '西上相', ('Leo', 'Eps'): '轩辕十三', ('Leo', 'Zet'): '轩辕十五',
    ('Leo', 'Eta'): '轩辕十三', ('Leo', 'Mu'): '轩辕十', ('Leo', 'Omi'): '轩辕十一',
    ('Aur', 'Alp'): '五车二', ('Aur', 'Bet'): '五车三', ('Aur', 'Gam'): '柱一',
    ('Aur', 'Del'): '五车增', ('Aur', 'Eps'): '五车增', ('Aur', 'Zet'): '五车四',
    ('CMa', 'Alp'): '天狼星', ('CMa', 'Bet'): '军市一', ('CMa', 'Gam'): '弧矢增',
    ('CMa', 'Del'): '弧矢一', ('CMa', 'Eps'): '弧矢七', ('CMa', 'Zet'): '弧矢二',
    ('CMa', 'Eta'): '弧矢增', ('CMa', 'Kap'): '弧矢增', ('Lep', 'Alp'): '厕一',
    ('Lep', 'Bet'): '厕二', ('Lep', 'Gam'): '厕增', ('Lep', 'Del'): '厕增',
    ('Lep', 'Eps'): '厕三', ('Tri', 'Alp'): '三角一', ('Tri', 'Bet'): '三角二',
    ('Tri', 'Gam'): '三角三', ('Ser', 'Alp'): '巨蛇一', ('Ser', 'Bet'): '巨蛇β',
    ('Pup', 'Alp'): '弧矢增二十二', ('Pup', 'Zet'): '弧矢增', ('Vel', 'Gam'): '十字架增',
    ('Lup', 'Alp'): '豺狼一', ('Lup', 'Bet'): '豺狼β', ('Col', 'Alp'): '天鸽α',
    ('Col', 'Bet'): '天鸽β', ('Mon', 'Alp'): '麒麟α', ('Mon', 'Bet'): '麒麟β',
    ('CrA', 'Alp'): '南冕α', ('CrA', 'Bet'): '南冕β', ('Com', 'Alp'): '后发α',
    ('Com', 'Bet'): '后发β', ('Sge', 'Alp'): '天箭α', ('Sge', 'Bet'): '天箭β',
    ('Phe', 'Alp'): '天钩一', ('Phe', 'Bet'): '凤凰β', ('Gru', 'Alp'): '鹤一',
    ('Gru', 'Bet'): '鹤增', ('Gru', 'Gam'): '鹤二', ('Ara', 'Alp'): '天坛α',
    ('Mus', 'Alp'): '苍蝇一', ('Tuc', 'Alp'): '杜鹃α', ('Hyi', 'Bet'): '水蛇二',
}

# Figure constellation edge specs: (const_abbr, [(greek/fl, greek/fl), ...])
FIGURE_SPECS = {
    'Ori': [
        ('Bet', 'Mu'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Kap'), ('Kap', 'Iot'),
        ('Bet', 'Pi3'), ('Pi3', 'Pi4'), ('Pi4', 'Pi5'), ('Pi5', 'Pi6'),
        ('Bet', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Chi1'),
        ('Kap', 'Saiph'), ('Saiph', 'Rig'), ('Del', 'Rig'), ('Bet', 'Alp'), ('Alp', 'Lam'),
    ],
    'Cen': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Eta')],
    'Hya': [('Alp', 'Sig'), ('Sig', 'Zet'), ('Zet', 'Eps'), ('Eps', 'Del'), ('Del', 'Gam')],
    'Dra': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot')],
    'Eri': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Tau'), ('Tau', 'Ups')],
    'Her': [('Bet', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Pi'), ('Pi', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Kap'), ('Kap', 'Del'), ('Del', 'Gam'), ('Gam', 'Alp'), ('Alp', 'Bet')],
    'Vir': [('Alp', 'Gam'), ('Gam', 'Eps'), ('Eps', 'Del'), ('Del', 'Eta'), ('Eta', 'Zet'), ('Zet', 'Alp')],
    'Oph': [('Alp', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Bet'), ('Bet', 'Alp')],
    'And': [('Alp', 'Del'), ('Del', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Ups'), ('Ups', 'Pi'), ('Pi', 'Alp')],
    'Peg': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Alp'), ('Alp', 'Del'), ('Del', 'Eps'), ('Eps', 'Eta'), ('Eta', 'Zet'), ('Zet', 'Alp')],
    'UMa': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Alp'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Alp', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi')],
    'Sgr': [('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Phi'), ('Phi', 'Lam'), ('Lam', 'Kap'), ('Kap', 'Eta'), ('Eta', 'Gam')],
    'Cyg': [('Alp', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Bet'), ('Bet', 'Alp')],
    'Aql': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Alp')],
    'Tau': [('Alp', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Bet'), ('Bet', 'Alp'), ('Del', 'Tet'), ('Eps', 'Tet')],
    'Gem': [('Alp', 'Bet'), ('Alp', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Gam'), ('Bet', 'Del'), ('Del', 'Kap'), ('Kap', 'Iot'), ('Iot', 'Lam')],
    'Leo': [('Alp', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Mu'), ('Mu', 'Omi'), ('Omi', 'Alp'), ('Alp', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Del')],
    'Aur': [('Alp', 'Bet'), ('Bet', 'Zet'), ('Zet', 'Eps'), ('Eps', 'Del'), ('Del', 'Eta'), ('Eta', 'Alp'), ('Alp', 'Gam')],
    'CMa': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Lep': [('Alp', 'Bet'), ('Bet', 'Eps'), ('Eps', 'Mu'), ('Mu', 'Del'), ('Del', 'Gam'), ('Gam', 'Alp')],
    'Tri': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Alp')],
    'Ser': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Pup': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Vel': [('Gam', 'Del'), ('Del', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Lup': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Col': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Lam'), ('Lam', 'Kap'), ('Kap', 'Iot'), ('Iot', 'Tet'), ('Tet', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Mon': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'CrA': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Com': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Sge': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Phe': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Gru': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
    'Ara': [('Alp', 'Bet'), ('Bet', 'Gam'), ('Gam', 'Del'), ('Del', 'Eps'), ('Eps', 'Zet'), ('Zet', 'Eta'), ('Eta', 'Tet'), ('Tet', 'Iot'), ('Iot', 'Kap'), ('Kap', 'Lam'), ('Lam', 'Mu'), ('Mu', 'Nu'), ('Nu', 'Xi'), ('Xi', 'Omi'), ('Omi', 'Pi'), ('Pi', 'Rho'), ('Rho', 'Sig'), ('Sig', 'Tau'), ('Tau', 'Ups'), ('Ups', 'Phi'), ('Phi', 'Chi'), ('Chi', 'Psi'), ('Psi', 'Ome')],
}

# Explicit metadata for stars where BSC parsing or coordinate matching is ambiguous.
HIP_META = {
    2081: ('ankaa', '天钩一', '凤凰座'),
    68933: ('menkent', '库楼三', '半人马座'),
    39429: ('naos', '弧矢增二十二', '船尾座'),
    39953: ('regor', '十字架增', '船帆座'),
    109268: ('alnair', '鹤一', '天鹤座'),
    61585: ('alphaMus', '苍蝇一', '苍蝇座'),
    110130: ('alphaTuc', '杜鹃一', '杜鹃座'),
    2021: ('betaHyi', '水蛇二', '水蛇座'),
    108085: ('gammaGru', '鹤二', '天鹤座'),
    64962: ('gammaHya', '星宿增', '长蛇座'),
    77070: ('alphaSer', '巨蛇一', '巨蛇座'),
    80331: ('etaDra', '右枢增', '天龙座'),
    112158: ('etaPeg', '室宿增', '飞马座'),
    88635: ('gamma2Sgr', '箕宿增', '人马座'),
    26241: ('iotaOri', '参宿ι', '猎户座'),
    22509: ('pi2Ori', '参宿π2', '猎户座'),
    22449: ('pi3Ori', '参宿π3', '猎户座'),
    22549: ('pi4Ori', '参宿π4', '猎户座'),
    22797: ('pi5Ori', '参宿π5', '猎户座'),
    23123: ('pi6Ori', '参宿π6', '猎户座'),
    28614: ('muOri', '参宿μ', '猎户座'),
    29038: ('nuOri', '参宿ν', '猎户座'),
    29426: ('xiOri', '参宿ξ', '猎户座'),
    27913: ('chi1Ori', '参宿χ1', '猎户座'),
    61932: ('gammaCen', '库楼二', '半人马座'),
    66657: ('epsilonCen', '库楼增', '半人马座'),
    68002: ('zetaCen', '库楼增二', '半人马座'),
    71352: ('etaCen', '库楼增三', '半人马座'),
    65109: ('iotaCen', '半人马ι', '半人马座'),
    59196: ('deltaCen', '半人马δ', '半人马座'),
    42913: ('deltaVel', '船帆δ', '船帆座'),
    44816: ('lambdaVel', '船帆λ', '船帆座'),
    45941: ('kappaVel', '船帆κ', '船帆座'),
    52727: ('muVel', '船帆μ', '船帆座'),
    87833: ('gammaDra', '天棓一', '天龙座'),
    85670: ('betaDra', '天棓三', '天龙座'),
    112122: ('betaGru', '鹤增', '天鹤座'),
    107315: ('epsilonPeg', '室宿增', '飞马座'),
    89931: ('deltaSgr', '斗宿二', '人马座'),
    90496: ('lambdaSgr', '斗宿增', '人马座'),
    94141: ('piSgr', '斗宿三', '人马座'),
    89341: ('muSgr', '斗宿增二', '人马座'),
    84345: ('rasalgethi', '帝座', '武仙座'),
}

TARGET_CONSTELLATIONS = {
    'Ori', 'Cen', 'Hya', 'Dra', 'Eri', 'Her', 'Vir', 'Oph', 'And', 'Peg', 'UMa', 'Sgr',
    'Cyg', 'Aql', 'Tau', 'Gem', 'Leo', 'Aur', 'CMa', 'Lep', 'Tri', 'Ser', 'Pup', 'Vel',
    'Lup', 'Col', 'Mon', 'CrA', 'Com', 'Sge', 'Phe', 'Gru', 'Ara',
}


def parse_tsv(path: Path):
    rows = []
    with path.open() as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            if line.startswith('HIP') or line.startswith('HD') or line.startswith('---') or line.startswith('mag') or line.startswith('deg'):
                continue
            rows.append(line.rstrip('\n').split('\t'))
    return rows


def parse_hms(s: str) -> float:
    s = s.strip()
    if not s:
        return float('nan')
    parts = s.split()
    if len(parts) == 3:
        h, m, sec = map(float, parts)
        return (h + m / 60 + sec / 3600) * 15
    return float('nan')


def parse_dms(s: str) -> float:
    s = s.strip()
    if not s:
        return float('nan')
    sign = -1 if s.startswith('-') else 1
    s = s.lstrip('+-')
    parts = s.split()
    if len(parts) == 3:
        d, m, sec = map(float, parts)
        return sign * (d + m / 60 + sec / 3600)
    return float('nan')


def ang_sep(ra1, dec1, ra2, dec2):
    d1, d2 = math.radians(dec1), math.radians(dec2)
    r1, r2 = math.radians(ra1), math.radians(ra2)
    c = math.sin(d1) * math.sin(d2) + math.cos(d1) * math.cos(d2) * math.cos(r1 - r2)
    return math.degrees(math.acos(max(-1, min(1, c))))


def parse_bsc_name(name: str):
    name = name.strip()
    if not name:
        return None
    # Examples: "21Alp And", "33 Psc", "1Pi 3Ori", "5The Cen", "10Gam2Sgr", "52Psi UMa"
    m = re.match(r'(?:(\d+))?\s*([A-Za-z]+\d?)\s+(\d+)?([A-Za-z]+)$', name)
    if m:
        fl = int(m.group(1)) if m.group(1) else (int(m.group(3)) if m.group(3) else None)
        greek = m.group(2)
        con = m.group(4)
        return fl, greek, con
    m2 = re.match(r'(\d+)\s+([A-Za-z]+)$', name)
    if m2:
        return int(m2.group(1)), None, m2.group(2)
    return None


def chinese_name(greek: str | None, con: str, fl: int | None = None) -> str:
    if greek:
        for (c, g), name in BAYER_CN.items():
            if c == con and (g == greek or greek.startswith(g[:3])):
                return name
    greek_sym = {
        'Alp': 'α', 'Bet': 'β', 'Gam': 'γ', 'Del': 'δ', 'Eps': 'ε', 'Zet': 'ζ', 'Eta': 'η',
        'Tet': 'θ', 'The': 'θ', 'Iot': 'ι', 'Kap': 'κ', 'Lam': 'λ', 'Mu': 'μ', 'Nu': 'ν',
        'Xi': 'ξ', 'Omi': 'ο', 'Pi': 'π', 'Rho': 'ρ', 'Sig': 'σ', 'Tau': 'τ', 'Ups': 'υ',
        'Phi': 'φ', 'Chi': 'χ', 'Psi': 'ψ', 'Ome': 'ω',
    }
    if greek:
        sym = greek_sym.get(greek[:3], greek)
        if len(greek) > 3 and greek[3:].isdigit():
            sym += greek[3:]
        return f'{CONST_CN.get(con, con)}{sym}'
    if fl is not None:
        return f'{CONST_CN.get(con, con)}{fl}号'
    return CONST_CN.get(con, con)


def bayer_id(greek: str | None, con: str, fl: int | None = None) -> str:
    if greek:
        prefix = greek[:3]
        suffix = greek[3:] if len(greek) > 3 else ''
        base = GREEK.get(prefix, prefix.lower())
        if suffix.isdigit():
            base += suffix
        con_suffix = con[0].upper() + con[1:].lower() if len(con) == 3 else con
        return base + con_suffix
    if fl is not None:
        return f'fl{fl}{con}'
    return f'star{con}'


def color_from_bv(bv: float | None, sp: str = '') -> str:
    if bv is None or (isinstance(bv, float) and math.isnan(bv)):
        bv = 0.5
    sp = sp.strip().upper()
    if sp.startswith(('O', 'B')):
        return '#b7d4ff' if bv < 0 else '#9ec4ff'
    if sp.startswith('A'):
        return '#eef4ff'
    if sp.startswith('F'):
        return '#fff1c8'
    if sp.startswith('G'):
        return '#ffe3a8' if bv < 1 else '#ffb56a'
    if sp.startswith('K'):
        return '#ff8f55'
    if sp.startswith(('M', 'S', 'C')):
        return '#ff6d4a'
    if bv < 0:
        return '#9ec4ff'
    if bv < 0.3:
        return '#eef4ff'
    if bv < 0.8:
        return '#fff1c8'
    if bv < 1.4:
        return '#ffb56a'
    return '#ff6d4a'


def load_existing():
    with (ROOT / 'src/data/stars.yaml').open() as f:
        stars = yaml.safe_load(f)['stars']
    by_id = {s['id']: s for s in stars}
    return stars, by_id


def match_existing(ra_deg, dec_deg, existing_stars, used_ids):
    best, best_sep = None, 0.08
    for s in existing_stars:
        sep = ang_sep(ra_deg, dec_deg, s['raHours'] * 15, s['decDeg'])
        if sep < best_sep:
            best_sep = sep
            best = s
    if best and best['id'] not in used_ids:
        return best
    return None


def main():
    hip_bright_rows = parse_tsv(CACHE / 'hip_bright.tsv')
    hip_figure_rows = parse_tsv(CACHE / 'hip_figure.tsv')
    bsc_rows = parse_tsv(CACHE / 'bsc_full.tsv')

    hip_data = {}
    for row in hip_figure_rows:
        if not row[0].strip().isdigit():
            continue
        if len(row) < 4 or not row[2].strip() or not row[3].strip():
            continue
        hip = int(row[0].strip())
        vmag = float(row[1].strip())
        ra = float(row[2].strip())
        dec_raw = row[3].strip()
        dec = float(dec_raw.lstrip('+'))
        if dec_raw.startswith('-'):
            dec = -abs(dec)
        bv = float(row[4].strip()) if len(row) > 4 and row[4].strip() else None
        sp = row[5].strip() if len(row) > 5 else ''
        hd = int(row[6].strip()) if len(row) > 6 and row[6].strip().isdigit() else None
        hip_data[hip] = dict(hip=hip, vmag=vmag, ra_deg=ra, dec_deg=dec, ra_hours=ra / 15, bv=bv, sp=sp, hd=hd)

    # Merge bright-only rows (may lack HD/SpType)
    for row in hip_bright_rows:
        if not row[0].strip().isdigit() or len(row) < 4 or not row[2].strip():
            continue
        hip = int(row[0].strip())
        if hip in hip_data:
            continue
        ra = float(row[2].strip())
        dec_raw = row[3].strip()
        dec = float(dec_raw.lstrip('+'))
        if dec_raw.startswith('-'):
            dec = -abs(dec)
        hip_data[hip] = dict(
            hip=hip, vmag=float(row[1].strip()), ra_deg=ra, dec_deg=dec, ra_hours=ra / 15,
            bv=float(row[4].strip()) if len(row) > 4 and row[4].strip() else None,
            sp=row[5].strip() if len(row) > 5 else '', hd=None,
        )

    hd_bsc = {}
    bsc_by_key = {}
    for row in bsc_rows:
        if not row[0].strip().isdigit():
            continue
        hd = int(row[0].strip())
        vmag = float(row[1].strip()) if row[1].strip() else 99
        name = row[2]
        ra = parse_hms(row[3])
        dec = parse_dms(row[4])
        sp = row[5].strip() if len(row) > 5 else ''
        parsed = parse_bsc_name(name)
        rec = dict(hd=hd, vmag=vmag, name=name, ra=ra, dec=dec, sp=sp, parsed=parsed)
        hd_bsc[hd] = rec
        if parsed:
            fl, greek, con = parsed
            key = (con, greek or str(fl))
            bsc_by_key.setdefault(key, []).append(rec)

    existing_stars, existing_by_id = load_existing()
    existing_ids = set(existing_by_id)
    hip_to_existing = {}
    used_existing = set()

    for s in existing_stars:
        ra_deg = s['raHours'] * 15
        best_hip, best_sep = None, 0.1
        for hip, d in hip_data.items():
            sep = ang_sep(ra_deg, s['decDeg'], d['ra_deg'], d['dec_deg'])
            if sep < best_sep:
                best_sep = sep
                best_hip = hip
        if best_hip is not None:
            hip_to_existing[best_hip] = s
            used_existing.add(s['id'])

    # α Cen secondary shares catalog id with Rigil Kentaurus
    if 71683 in hip_to_existing:
        hip_to_existing[71681] = hip_to_existing[71683]

    def resolve_star(hip: int):
        d = hip_data.get(hip)
        if not d:
            return None
        if hip in hip_to_existing:
            s = hip_to_existing[hip]
            return {**d, 'id': s['id'], 'name': s['name'], 'constellation': s['constellation']}
        if hip in HIP_META:
            sid, name, con = HIP_META[hip]
            return {**d, 'id': sid, 'name': name, 'constellation': con}
        hd = d.get('hd')
        bsc = hd_bsc.get(hd) if hd else None
        con = None
        greek = None
        fl = None
        if bsc and bsc['parsed']:
            fl, greek, con = bsc['parsed']
        if not con and hd:
            for k, recs in bsc_by_key.items():
                for r in recs:
                    if r['hd'] == hd:
                        con = k[0]
                        greek = k[1] if not k[1].isdigit() else None
                        fl = int(k[1]) if k[1].isdigit() else None
        if not con:
            return None
        sid = bayer_id(greek, con, fl if isinstance(fl, int) else None)
        cn = chinese_name(greek, con, fl if isinstance(fl, int) else None)
        return {**d, 'id': sid, 'name': cn, 'constellation': CONST_CN.get(con, con)}

    # --- bright-stars-v3 ---
    bright_entries = []
    bright_hips = set()
    for row in hip_bright_rows:
        if not row[0].strip().isdigit():
            continue
        hip = int(row[0].strip())
        bright_hips.add(hip)
        star = resolve_star(hip)
        if not star:
            d = hip_data[hip]
            star = {**d, 'id': f'hip{hip}', 'name': f'HIP {hip}', 'constellation': '未知'}
        bright_entries.append({
            'id': star['id'],
            'name': star['name'],
            'constellation': star['constellation'],
            'magnitude': round(star['vmag'], 2),
            'hip': hip,
        })

    # Ensure explicit bright stars with V<=3.0 are included
    for hip in HIP_META:
        if hip in hip_data and hip_data[hip]['vmag'] <= 3.0:
            bright_hips.add(hip)
            star = resolve_star(hip)
            if star and not any(e['hip'] == hip for e in bright_entries):
                bright_entries.append({
                    'id': star['id'], 'name': star['name'], 'constellation': star['constellation'],
                    'magnitude': round(star['vmag'], 2), 'hip': hip,
                })

    bright_entries.sort(key=lambda e: e['magnitude'])

    # --- additional-stars ---
    additional_hips = set()

    # Missing bright stars
    for hip in bright_hips:
        star = resolve_star(hip)
        if star and star['id'] not in existing_ids:
            additional_hips.add(hip)

    # Figure stars (3.0 < V <= 4.5) from BSC in target constellations
    for row in bsc_rows:
        if not row[0].strip().isdigit() or not row[1].strip():
            continue
        vmag = float(row[1].strip())
        if vmag <= 3.0 or vmag > 4.5:
            continue
        parsed = parse_bsc_name(row[2])
        if not parsed:
            continue
        fl, greek, con = parsed
        if con not in TARGET_CONSTELLATIONS:
            continue
        hd = int(row[0].strip())
        for hip, d in hip_data.items():
            if d.get('hd') != hd:
                continue
            if d['vmag'] <= 3.0 or d['vmag'] > 4.5:
                break
            star = resolve_star(hip)
            if star and star['id'] not in existing_ids:
                additional_hips.add(hip)
            break

    # Explicit Orion / southern figure anchors from HIP_META
    for hip in HIP_META:
        if hip in hip_data and 3.0 < hip_data[hip]['vmag'] <= 4.5:
            star = resolve_star(hip)
            if star and star['id'] not in existing_ids:
                additional_hips.add(hip)

    # Cap total additional stars at ~200, but always keep explicit anchors first
    bright_missing = {hip for hip in bright_hips if (resolve_star(hip) and resolve_star(hip)['id'] not in existing_ids)}
    mandatory = set(HIP_META.keys())
    for row in bsc_rows:
        if not row[0].strip().isdigit() or not row[1].strip():
            continue
        parsed = parse_bsc_name(row[2])
        if parsed and parsed[2] in {'Tri', 'Ser', 'Pup', 'Vel', 'Lup', 'Col', 'Mon', 'CrA', 'Com', 'Sge', 'Phe', 'Gru', 'Ara'}:
            hd = int(row[0].strip())
            for hip, d in hip_data.items():
                if d.get('hd') == hd and 3.0 < d['vmag'] <= 4.5:
                    mandatory.add(hip)
                    break
    figure_candidates = (additional_hips | mandatory) - bright_missing
    max_figure = max(117, 200 - len(bright_missing))
    ordered = sorted(figure_candidates, key=lambda h: (0 if h in mandatory else 1, hip_data[h]['vmag']))
    figure_selected = set(ordered[:max_figure])
    additional_hips = bright_missing | figure_selected

    additional = []
    for hip in sorted(additional_hips, key=lambda h: hip_data[h]['vmag']):
        star = resolve_star(hip)
        if not star:
            continue
        d = hip_data[hip]
        additional.append({
            'id': star['id'],
            'name': star['name'],
            'constellation': star['constellation'],
            'raHours': round(d['ra_hours'], 4),
            'decDeg': round(d['dec_deg'], 3),
            'magnitude': round(d['vmag'], 2),
            'color': color_from_bv(d['bv'], d['sp']),
        })

    # Dedupe by id
    seen = set()
    deduped = []
    for s in additional:
        if s['id'] in seen or s['id'] in existing_ids:
            continue
        seen.add(s['id'])
        deduped.append(s)
    additional = deduped

    duplicates = sorted({e['id'] for e in bright_entries if e['id'] in existing_ids})

    with OUT_BRIGHT.open('w') as f:
        yaml.dump({'source': 'hipparcos-v3-bright', 'stars': bright_entries}, f,
                  allow_unicode=True, sort_keys=False, default_flow_style=False, width=120)

    with OUT_ADD.open('w') as f:
        yaml.dump({'source': 'hipparcos-bsc-figure-expansion', 'stars': additional}, f,
                  allow_unicode=True, sort_keys=False, default_flow_style=False, width=120)

    print(f'bright-stars-v3: {len(bright_entries)} entries')
    print(f'additional-stars: {len(additional)} entries')
    print(f'duplicate ids with existing catalog: {len(duplicates)}')
    if duplicates:
        print('  ', ', '.join(duplicates[:30]), '...' if len(duplicates) > 30 else '')


if __name__ == '__main__':
    main()
