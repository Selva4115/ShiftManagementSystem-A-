import pytest
import json
from datetime import date, datetime
from app.backend.models.employee import Employee
from app.backend.models.user import User
from app.backend.models.attendance import Attendance

def test_clock_in_flow(client, init_database):
    """Test successful clock-in flow for an active employee"""
    # 1. Register employee
    login_response = client.post('/api/auth/login', 
                                 data=json.dumps({
                                     'email': 'admin@test.com',
                                     'password': 'AdminPass123'
                                 }),
                                 content_type='application/json')
    token = json.loads(login_response.data.decode())['token']

    # 2. Trigger clock-in request
    response = client.post('/api/attendance/clock-in',
                           headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    data = json.loads(response.data.decode())
    assert data['clock_in'] is not None
    assert data['status'] in ['present', 'late', 'absent']


def test_clock_out_validation(client, init_database):
    """Test successful clock-out flow following clock-in"""
    login_response = client.post('/api/auth/login', 
                                 data=json.dumps({
                                     'email': 'admin@test.com',
                                     'password': 'AdminPass123'
                                 }),
                                 content_type='application/json')
    token = json.loads(login_response.data.decode())['token']

    # Clock in first
    client.post('/api/attendance/clock-in', headers={'Authorization': f'Bearer {token}'})

    # Clock out
    response = client.post('/api/attendance/clock-out', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    data = json.loads(response.data.decode())
    assert data['clock_out'] is not None
