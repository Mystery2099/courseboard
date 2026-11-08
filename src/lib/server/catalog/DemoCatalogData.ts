/**
 * Demonstration catalog. Alfred State College, where the platform is demonstrated, is the main
 * school; descriptions are placeholders rather than official catalog text. The two fictional schools
 * both offer a "CS 101", showing that course codes are only unique within an institution.
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
	}
] as const;
