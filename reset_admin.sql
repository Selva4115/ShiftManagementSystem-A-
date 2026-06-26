USE shift_db;

-- Show current users
SELECT id, email, role FROM users;

-- Update existing admin OR insert new one
UPDATE users 
SET email = 'admin@shift.com',
    password_hash = 'scrypt:32768:8:1$asbGgMH4fnxttM8V$571a553f7e493930e8e6e67770c57a02481a6113ffc71ae53414863a47d4a89db6f04a54e60748cc2c030140c3712482a83398fde82ea0fe0ad54c89b8126a90'
WHERE role = 'admin';

-- Verify result
SELECT id, email, role FROM users WHERE role = 'admin';
