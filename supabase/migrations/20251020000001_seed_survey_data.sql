-- Seed data untuk survei penelitian prototyping
-- Survey untuk evaluasi sistem Edu-Grade

-- Insert survey utama
INSERT INTO surveys (id, title, description, is_active, iteration) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Evaluasi Sistem Edu-Grade (Iterasi 1)', 'Survei evaluasi untuk sistem ujian online Edu-Grade dalam penelitian prototyping', true, 1);

-- Insert pertanyaan survei
-- Kategori: Usability
INSERT INTO survey_questions (survey_id, question_text, question_type, category, order_number, is_required) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Sistem ini mudah untuk digunakan', 'likert', 'usability', 1, true),
('550e8400-e29b-41d4-a716-446655440000', 'Navigasi menu dalam sistem ini jelas dan intuitif', 'likert', 'usability', 2, true),
('550e8400-e29b-41d4-a716-446655440000', 'Saya dapat dengan mudah menemukan fitur yang saya butuhkan', 'likert', 'usability', 3, true),
('550e8400-e29b-41d4-a716-446655440000', 'Tampilan sistem ini konsisten di setiap halaman', 'likert', 'usability', 4, true);

-- Kategori: Functionality
INSERT INTO survey_questions (survey_id, question_text, question_type, category, order_number, is_required) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Fitur ujian online berfungsi dengan baik', 'likert', 'functionality', 5, true),
('550e8400-e29b-41d4-a716-446655440000', 'Sistem penilaian otomatis bekerja dengan akurat', 'likert', 'functionality', 6, true),
('550e8400-e29b-41d4-a716-446655440000', 'Fitur manajemen kelas membantu proses pembelajaran', 'likert', 'functionality', 7, true),
('550e8400-e29b-41d4-a716-446655440000', 'Sistem memberikan feedback yang jelas setelah ujian', 'likert', 'functionality', 8, true);

-- Kategori: Design
INSERT INTO survey_questions (survey_id, question_text, question_type, category, order_number, is_required) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Desain antarmuka sistem menarik', 'likert', 'design', 9, true),
('550e8400-e29b-41d4-a716-446655440000', 'Pemilihan warna dan font mudah dibaca', 'likert', 'design', 10, true),
('550e8400-e29b-41d4-a716-446655440000', 'Tata letak informasi tertata dengan rapi', 'likert', 'design', 11, true);

-- Kategori: Satisfaction
INSERT INTO survey_questions (survey_id, question_text, question_type, category, order_number, is_required) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Secara keseluruhan, saya puas dengan sistem ini', 'likert', 'satisfaction', 12, true),
('550e8400-e29b-41d4-a716-446655440000', 'Saya akan merekomendasikan sistem ini kepada orang lain', 'likert', 'satisfaction', 13, true),
('550e8400-e29b-41d4-a716-446655440000', 'Berapa rating yang Anda berikan untuk sistem ini?', 'rating', 'satisfaction', 14, true);

-- Kategori: General (Open-ended)
INSERT INTO survey_questions (survey_id, question_text, question_type, category, order_number, is_required) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Apa fitur yang paling Anda sukai dari sistem ini?', 'text', 'general', 15, false),
('550e8400-e29b-41d4-a716-446655440000', 'Apa yang perlu diperbaiki dari sistem ini?', 'text', 'general', 16, false),
('550e8400-e29b-41d4-a716-446655440000', 'Saran atau komentar tambahan', 'text', 'general', 17, false);
