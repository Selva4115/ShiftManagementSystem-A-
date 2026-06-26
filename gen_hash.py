from werkzeug.security import generate_password_hash
h = generate_password_hash('Admin@123')
print(h)
