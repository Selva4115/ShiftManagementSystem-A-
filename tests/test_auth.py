import json

def test_login_success(client, init_database):
    """Test login with valid credentials"""
    response = client.post('/api/auth/login', 
                           data=json.dumps({
                               'email': 'admin@test.com',
                               'password': 'AdminPass123'
                           }),
                           content_type='application/json')
    data = json.loads(response.data.decode())
    assert response.status_code == 200
    assert 'token' in data
    assert data['user']['role'] == 'admin'

def test_login_invalid_password(client, init_database):
    """Test login with invalid password fails"""
    response = client.post('/api/auth/login', 
                           data=json.dumps({
                               'email': 'admin@test.com',
                               'password': 'WrongPassword123'
                           }),
                           content_type='application/json')
    assert response.status_code == 401
    data = json.loads(response.data.decode())
    assert 'token' not in data
    assert 'Invalid email or password' in data['message']

def test_get_current_user_profile(client, init_database):
    """Test fetching profile for authorized session"""
    # 1. Login to get token
    login_response = client.post('/api/auth/login', 
                                 data=json.dumps({
                                     'email': 'admin@test.com',
                                     'password': 'AdminPass123'
                                 }),
                                 content_type='application/json')
    token = json.loads(login_response.data.decode())['token']

    # 2. Query profile endpoint
    response = client.get('/api/auth/me', 
                          headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    data = json.loads(response.data.decode())
    assert data['email'] == 'admin@test.com'
    assert data['role'] == 'admin'
