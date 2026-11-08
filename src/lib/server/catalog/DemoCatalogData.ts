/**
 * Demonstration catalog. Alfred State College, where the platform is demonstrated, is the main
 * school; descriptions are placeholders rather than official catalog text. Every other school is
 * fictional. Several offer a "CS 101", showing that course codes are only unique within an
 * institution.
 */
export const DEMO_CATALOG = [
	{
		institutionName: 'Alfred State College',
		courses: [
			{
				code: 'CISY 2253',
				title: 'Intro to Databases',
				description: 'Relational design, SQL queries, and the basics of database management.'
			},
			{
				code: 'CISY 4053',
				title: 'Machine Learning Fundamentals',
				description: 'Core machine learning ideas, models, and how to evaluate them.'
			},
			{
				code: 'CISY 6113',
				title: 'Software Engineering Practices',
				description: 'Requirements, design, testing, and teamwork on a shared codebase.'
			},
			{
				code: 'CISY 7013',
				title: 'NoSQL Data Systems',
				description: 'Document, key-value, and graph databases and when to use each.'
			},
			{
				code: 'CISY 8503',
				title: 'Applied Database Management',
				description: 'Data modeling, indexing, and querying in applied database projects.'
			},
			{
				code: 'CISY 9020',
				title: 'Senior Capstone II',
				description: 'The second half of the senior capstone project.'
			},
			{
				code: 'MATH 2073',
				title: 'Discrete Mathematics',
				description: 'Logic, sets, proofs, combinatorics, and graphs.'
			}
		]
	},
	{
		institutionName: 'Northfield State University',
		courses: [
			{
				code: 'CS 101',
				title: 'Introduction to Programming',
				description: 'Variables, control flow, functions, and problem solving in Python.'
			},
			{
				code: 'CS 201',
				title: 'Data Structures',
				description: 'Lists, trees, hash tables, graphs, and the analysis of algorithms on them.'
			},
			{
				code: 'CS 340',
				title: 'Database Systems',
				description: 'Relational and document databases, data modeling, indexing, and queries.'
			},
			{
				code: 'MATH 151',
				title: 'Calculus I',
				description: 'Limits, derivatives, and an introduction to integration.'
			},
			{
				code: 'ENG 102',
				title: 'College Writing II',
				description: 'Research-based argumentative writing and source evaluation.'
			},
			{
				code: 'HIST 110',
				title: 'World History Since 1500',
				description: 'Global connections, empires, and revolutions in the modern era.'
			}
		]
	},
	{
		institutionName: 'Lakeshore Community College',
		courses: [
			{
				code: 'CS 101',
				title: 'Computing Fundamentals',
				description: 'How computers work, basic programming, and digital literacy.'
			},
			{
				code: 'BIO 110',
				title: 'Principles of Biology',
				description: 'Cells, genetics, evolution, and ecology, with a weekly lab.'
			},
			{
				code: 'MATH 120',
				title: 'College Algebra',
				description: 'Functions, equations, and graphs in preparation for calculus.'
			},
			{
				code: 'PSY 101',
				title: 'Introduction to Psychology',
				description: 'Perception, memory, development, and the methods of psychological research.'
			}
		]
	},
	{
		institutionName: 'Thistlewood University',
		courses: [
			{
				code: 'CS 101',
				title: 'Introduction to Computer Science',
				description: 'Algorithms, abstraction, and programming fundamentals in Java.'
			},
			{
				code: 'CS 310',
				title: 'Web Application Development',
				description: 'Building server-rendered and client-side web applications with a database.'
			},
			{
				code: 'IS 420',
				title: 'Information Security',
				description: 'Threat modeling, authentication, encryption, and secure application design.'
			},
			{
				code: 'STAT 200',
				title: 'Introductory Statistics',
				description: 'Descriptive statistics, probability, sampling, and hypothesis testing.'
			},
			{
				code: 'PHIL 105',
				title: 'Ethics and Technology',
				description: 'Privacy, automation, and responsibility in a networked society.'
			}
		]
	},
	{
		institutionName: 'Kestrel Bay College',
		courses: [
			{
				code: 'NURS 101',
				title: 'Foundations of Nursing',
				description: 'Patient care, safety, communication, and the role of the nurse.'
			},
			{
				code: 'BIO 210',
				title: 'Anatomy and Physiology I',
				description: 'The structure and function of the human body, with a weekly lab.'
			},
			{
				code: 'CHEM 110',
				title: 'General Chemistry',
				description: 'Atomic structure, bonding, reactions, and stoichiometry.'
			},
			{
				code: 'ENG 101',
				title: 'College Writing I',
				description: 'Clear academic writing, revision, and the use of sources.'
			}
		]
	},
	{
		institutionName: 'Ashgrove Technical Institute',
		courses: [
			{
				code: 'CS 101',
				title: 'Programming Essentials',
				description: 'Problem solving and structured programming in C#.'
			},
			{
				code: 'NET 150',
				title: 'Networking Fundamentals',
				description: 'IP addressing, routing, switching, and network troubleshooting.'
			},
			{
				code: 'ELEC 120',
				title: 'Circuit Analysis',
				description: 'DC and AC circuits, Ohm’s law, and measurement with lab instruments.'
			},
			{
				code: 'CAD 101',
				title: 'Computer-Aided Drafting',
				description: 'Technical drawing and 2D and 3D modeling for engineering technology.'
			}
		]
	},
	{
		institutionName: 'Brindle Hill College',
		courses: [
			{
				code: 'BUS 101',
				title: 'Introduction to Business',
				description: 'How organizations are structured, financed, and managed.'
			},
			{
				code: 'ACCT 201',
				title: 'Financial Accounting',
				description: 'Recording transactions and preparing and reading financial statements.'
			},
			{
				code: 'ECON 102',
				title: 'Principles of Microeconomics',
				description: 'Supply and demand, market structures, and consumer choice.'
			},
			{
				code: 'MKT 230',
				title: 'Digital Marketing',
				description: 'Search, social, and email marketing, with campaign analytics.'
			}
		]
	}
] as const;
