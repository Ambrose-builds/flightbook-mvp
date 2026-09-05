from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import uuid
from datetime import datetime

app = FastAPI(title="FlightBook Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect("flights.db")
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            pnr_code TEXT PRIMARY KEY,
            passenger_name TEXT,
            contact_email TEXT,
            flight_number TEXT,
            aircraft TEXT,
            cabin_class TEXT,
            seat_number TEXT,
            route TEXT,
            created_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

FLIGHTS = [
    {
        "id": 1,
        "flight_number": "FB-101",
        "airline": "SkyBound Airways",
        "aircraft_type": "Boeing 787-9 Dreamliner",
        "aircraft_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80",
        "origin": "JFK",
        "origin_city": "New York",
        "destination": "LHR",
        "destination_city": "London",
        "base_price": 450.00,
        "available_seats": 14,
    },
    {
        "id": 2,
        "flight_number": "FB-204",
        "airline": "AeroGlobal",
        "aircraft_type": "Airbus A350-1000",
        "aircraft_image": "https://images.unsplash.com/photo-1519074069444-1ba4eff56022?auto=format&fit=crop&w=800&q=80",
        "origin": "LAX",
        "origin_city": "Los Angeles",
        "destination": "HND",
        "destination_city": "Tokyo",
        "base_price": 780.00,
        "available_seats": 6,
    },
    {
        "id": 3,
        "flight_number": "FB-309",
        "airline": "Continental Express",
        "aircraft_type": "Boeing 777-300ER",
        "aircraft_image": "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=800&q=80",
        "origin": "SFO",
        "origin_city": "San Francisco",
        "destination": "CDG",
        "destination_city": "Paris",
        "base_price": 620.00,
        "available_seats": 22,
    }
]

class Passenger(BaseModel):
    first_name: str
    last_name: str
    passport_num: str
    cabin_class: str
    seat_number: str

class BookingRequest(BaseModel):
    flight_id: int
    contact_email: str
    passengers: List[Passenger]

@app.get("/api/flights")
def get_flights():
    return FLIGHTS

@app.get("/api/occupied-seats/{flight_number}")
def get_occupied_seats(flight_number: str):
    conn = sqlite3.connect("flights.db")
    cursor = conn.cursor()
    cursor.execute("SELECT seat_number FROM bookings WHERE flight_number = ?", (flight_number,))
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows if r[0]]

@app.get("/api/bookings/{pnr}")
def get_booking_by_pnr(pnr: str):
    conn = sqlite3.connect("flights.db")
    cursor = conn.cursor()
    cursor.execute("SELECT pnr_code, passenger_name, contact_email, flight_number, aircraft, cabin_class, seat_number, route, created_at FROM bookings WHERE pnr_code = ?", (pnr.upper(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="PNR record not found")
    return {
        "pnr_code": row[0],
        "passenger_name": row[1],
        "contact_email": row[2],
        "flight_number": row[3],
        "aircraft": row[4],
        "cabin_class": row[5],
        "seat_number": row[6],
        "route": row[7],
        "created_at": row[8]
    }

@app.post("/api/bookings")
def create_booking(payload: BookingRequest):
    flight = next((f for f in FLIGHTS if f["id"] == payload.flight_id), None)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    pnr = f"PNR-{uuid.uuid4().hex[:6].upper()}"
    p = payload.passengers[0]

    conn = sqlite3.connect("flights.db")
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        pnr,
        f"{p.first_name} {p.last_name}",
        payload.contact_email,
        flight["flight_number"],
        flight["aircraft_type"],
        p.cabin_class,
        p.seat_number,
        f"{flight['origin']} → {flight['destination']}",
        datetime.utcnow().isoformat()
    ))
    conn.commit()
    conn.close()

    return {
        "pnr_code": pnr,
        "flight": flight,
        "contact_email": payload.contact_email,
        "passengers": [p.dict() for p in payload.passengers]
    }