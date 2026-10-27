"""Name lists for synthetic electors: (Latin, Devanagari) pairs.

Names are drawn uniformly at random for every part, independent of where anomalies are
injected, so the synthetic data never encodes any link between a community and a pattern.
Every person is a random combination; none is a real individual.
"""

# fmt: off
MALE_FIRST: list[tuple[str, str]] = [
    ("Ram", "राम"), ("Shyam", "श्याम"), ("Mohan", "मोहन"), ("Suresh", "सुरेश"),
    ("Ramesh", "रमेश"), ("Rajesh", "राजेश"), ("Mahesh", "महेश"), ("Dinesh", "दिनेश"),
    ("Mukesh", "मुकेश"), ("Rakesh", "राकेश"), ("Anil", "अनिल"), ("Sunil", "सुनील"),
    ("Vijay", "विजय"), ("Ajay", "अजय"), ("Sanjay", "संजय"), ("Amit", "अमित"),
    ("Rahul", "राहुल"), ("Rohit", "रोहित"), ("Vikas", "विकास"), ("Deepak", "दीपक"),
    ("Manoj", "मनोज"), ("Pankaj", "पंकज"), ("Ravi", "रवि"), ("Arun", "अरुण"),
    ("Ashok", "अशोक"), ("Gopal", "गोपाल"), ("Krishna", "कृष्ण"), ("Hari", "हरि"),
    ("Prakash", "प्रकाश"), ("Naresh", "नरेश"), ("Satish", "सतीश"), ("Vinod", "विनोद"),
    ("Pradeep", "प्रदीप"), ("Sandeep", "संदीप"), ("Kuldeep", "कुलदीप"), ("Arjun", "अर्जुन"),
    ("Aman", "अमन"), ("Karan", "करण"), ("Mohammad", "मोहम्मद"), ("Imran", "इमरान"),
    ("Salim", "सलीम"), ("Javed", "जावेद"), ("Iqbal", "इक़बाल"), ("Harpreet", "हरप्रीत"),
    ("Gurpreet", "गुरप्रीत"), ("Joseph", "जोसेफ़"), ("Yusuf", "यूसुफ़"), ("Abdul", "अब्दुल"),
    ("Rajendra", "राजेन्द्र"), ("Thomas", "थॉमस"),
]

FEMALE_FIRST: list[tuple[str, str]] = [
    ("Sita", "सीता"), ("Gita", "गीता"), ("Radha", "राधा"), ("Lakshmi", "लक्ष्मी"),
    ("Sunita", "सुनीता"), ("Anita", "अनीता"), ("Kavita", "कविता"), ("Savita", "सविता"),
    ("Pooja", "पूजा"), ("Priya", "प्रिया"), ("Neha", "नेहा"), ("Anjali", "अंजलि"),
    ("Rekha", "रेखा"), ("Meena", "मीना"), ("Seema", "सीमा"), ("Reena", "रीना"),
    ("Kiran", "किरण"), ("Asha", "आशा"), ("Usha", "उषा"), ("Nisha", "निशा"),
    ("Shanti", "शांति"), ("Kamla", "कमला"), ("Sarita", "सरिता"), ("Mamta", "ममता"),
    ("Rani", "रानी"), ("Sushma", "सुषमा"), ("Poonam", "पूनम"), ("Jyoti", "ज्योति"),
    ("Divya", "दिव्या"), ("Shabnam", "शबनम"), ("Fatima", "फ़ातिमा"), ("Ayesha", "आयशा"),
    ("Nazia", "नाज़िया"), ("Rubina", "रूबीना"), ("Simran", "सिमरन"), ("Harjeet", "हरजीत"),
    ("Mary", "मैरी"), ("Komal", "कोमल"), ("Sapna", "सपना"), ("Pinki", "पिंकी"),
]

SURNAMES: list[tuple[str, str]] = [
    ("Sharma", "शर्मा"), ("Verma", "वर्मा"), ("Gupta", "गुप्ता"), ("Singh", "सिंह"),
    ("Yadav", "यादव"), ("Chauhan", "चौहान"), ("Jain", "जैन"), ("Agarwal", "अग्रवाल"),
    ("Mishra", "मिश्रा"), ("Tiwari", "तिवारी"), ("Pandey", "पांडे"), ("Chaudhary", "चौधरी"),
    ("Saini", "सैनी"), ("Rathore", "राठौर"), ("Malik", "मलिक"), ("Khan", "ख़ान"),
    ("Ansari", "अंसारी"), ("Qureshi", "क़ुरैशी"), ("Sheikh", "शेख़"), ("Gill", "गिल"),
    ("Sandhu", "संधू"), ("Thomas", "थॉमस"), ("Rawat", "रावत"), ("Bisht", "बिष्ट"),
    ("Negi", "नेगी"), ("Joshi", "जोशी"), ("Mehta", "मेहता"), ("Kapoor", "कपूर"),
    ("Bansal", "बंसल"), ("Goyal", "गोयल"), ("Mittal", "मित्तल"), ("Sethi", "सेठी"),
    ("Dahiya", "दहिया"), ("Sangwan", "सांगवान"), ("Phogat", "फोगाट"), ("Hooda", "हुड्डा"),
    ("Kaushik", "कौशिक"), ("Sinha", "सिन्हा"),
]

# fmt: on

# Optional second names used instead of the family surname by some electors.
MALE_SECOND = ("Kumar", "कुमार")
FEMALE_SECOND = [("Devi", "देवी"), ("Kumari", "कुमारी")]

# Latin spelling variants, used to inject likely duplicates (rule R02) and spelling corrections.
LATIN_VARIANTS: dict[str, list[str]] = {
    "Mohammad": ["Mohammed", "Muhammad", "Mohd"],
    "Lakshmi": ["Laxmi"],
    "Sunil": ["Suneel"],
    "Pooja": ["Puja"],
    "Jyoti": ["Jyothi"],
    "Kavita": ["Kavitha"],
    "Chaudhary": ["Choudhary", "Chowdhury"],
    "Agarwal": ["Aggarwal", "Agrawal"],
    "Pandey": ["Pande"],
    "Yusuf": ["Yousuf"],
    "Iqbal": ["Ikbal"],
    "Ayesha": ["Aisha"],
    "Deepak": ["Dipak"],
    "Pradeep": ["Pradip"],
    "Sandeep": ["Sandip"],
    "Kuldeep": ["Kuldip"],
    "Rajendra": ["Rajinder"],
    "Fatima": ["Fatma"],
    "Shanti": ["Shanthi"],
    "Vinod": ["Vinodh"],
}
