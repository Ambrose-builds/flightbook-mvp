import React, { useState, useEffect, useRef } from 'react';

interface Flight {
  id: number;
  flight_number: string;
  airline: string;
  aircraft_type: string;
  aircraft_image: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  base_price: number;
  available_seats: number;
}

interface BookingResponse {
  pnr_code: string;
  flight: Flight;
  contact_email: string;
  passengers: Array<{
    first_name: string;
    last_name: string;
    passport_num: string;
    cabin_class: string;
    seat_number: string;
  }>;
}

// Full-screen interactive flight radar canvas background
const RadarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    const numParticles = 75;
    const colors = ['#22d3ee', '#f43f5e', '#fbbf24', '#38bdf8'];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let mouse = { x: width / 2, y: height / 2 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${1 - dist / 130})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mdist < 180) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.8 - mdist / 180})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
    />
  );
};

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([
    {
      id: 1,
      flight_number: "NW-101",
      airline: "Njoroge & Wanjohi SkyWays",
      aircraft_type: "Boeing 787-9 Dreamliner",
      aircraft_image: "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=800",
      origin: "JFK",
      origin_city: "New York",
      destination: "LHR",
      destination_city: "London",
      base_price: 450.00,
      available_seats: 14,
    },
    {
      id: 2,
      flight_number: "NW-204",
      airline: "Njoroge & Wanjohi SkyWays",
      aircraft_type: "Airbus A350-1000",
      aircraft_image: "https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg?auto=compress&cs=tinysrgb&w=800",
      origin: "LAX",
      origin_city: "Los Angeles",
      destination: "HND",
      destination_city: "Tokyo",
      base_price: 780.00,
      available_seats: 6,
    },
    {
      id: 3,
      flight_number: "NW-309",
      airline: "Njoroge & Wanjohi SkyWays",
      aircraft_type: "Boeing 777-300ER",
      aircraft_image: "https://images.pexels.com/photos/62623/wing-plane-flying-airplane-62623.jpeg?auto=compress&cs=tinysrgb&w=800",
      origin: "SFO",
      origin_city: "San Francisco",
      destination: "CDG",
      destination_city: "Paris",
      base_price: 620.00,
      available_seats: 22,
    }
  ]);

  const [selectedFlight, setSelectedFlight] = useState<Flight>(flights[0]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [cabinClass, setCabinClass] = useState<string>('Economy');
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [booking, setBooking] = useState<BookingResponse | null>(null);

  const [searchPnr, setSearchPnr] = useState('');
  const [searchedBooking, setSearchedBooking] = useState<any>(null);
  const [lookupError, setLookupError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    passport: ''
  });

  const classConfigs: Record<string, { rows: string[]; cols: string[]; priceMultiplier: number }> = {
    'First Class': { rows: ['1', '2'], cols: ['A', 'F'], priceMultiplier: 2.5 },
    'Business': { rows: ['3', '4', '5'], cols: ['A', 'C', 'D', 'F'], priceMultiplier: 1.6 },
    'Economy': { rows: ['6', '7', '8', '9', '10'], cols: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1.0 }
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/flights')
      .then(res => res.json())
      .then((data: Flight[]) => {
        if (data && data.length > 0) {
          setFlights(prev => prev.map((item, idx) => ({
            ...item,
            id: data[idx]?.id || item.id,
            base_price: data[idx]?.base_price || item.base_price,
            available_seats: data[idx]?.available_seats || item.available_seats,
            airline: "Njoroge & Wanjohi SkyWays"
          })));
        }
      })
      .catch(() => console.log("Using local flights data"));
  }, []);

  useEffect(() => {
    if (selectedFlight) {
      setSelectedSeat('');
      fetch(`http://localhost:8000/api/occupied-seats/${selectedFlight.flight_number}`)
        .then(res => res.json())
        .then(data => setOccupiedSeats(data))
        .catch(() => setOccupiedSeats([]));
    }
  }, [selectedFlight]);

  const handleClassChange = (newClass: string) => {
    setCabinClass(newClass);
    setSelectedSeat('');
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) {
      alert(`Please select a seat in ${cabinClass} before booking.`);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight_id: selectedFlight.id,
          contact_email: formData.email,
          passengers: [{
            first_name: formData.firstName,
            last_name: formData.lastName,
            passport_num: formData.passport,
            cabin_class: cabinClass,
            seat_number: selectedSeat
          }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        setOccupiedSeats([...occupiedSeats, selectedSeat]);
      } else {
        alert("Backend connection error. Make sure FastAPI server is running on port 8000.");
      }
    } catch (err) {
      alert("Backend connection failed. Make sure FastAPI server is running on port 8000.");
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setSearchedBooking(null);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${searchPnr.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedBooking(data);
      } else {
        setLookupError('No booking record found for that PNR code.');
      }
    } catch (err) {
      setLookupError('Failed to connect to server.');
    }
  };

  const currentConfig = classConfigs[cabinClass];
  const calculatedPrice = Math.round(selectedFlight.base_price * currentConfig.priceMultiplier);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-20 relative overflow-hidden">
      
      {/* Full Canvas Interactive Moving Graphics */}
      <RadarBackground />

      {/* Top Bar Navigation */}
      <nav className="relative z-10 max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center border-b border-white/10 gap-4 backdrop-blur-xl bg-slate-950/40">
        <div className="text-left">
          <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase block">Luxury Aviation</span>
          <h1 className="text-xl font-black text-white tracking-wider">
            NJOROGE & WANJOHI <span className="text-amber-300 font-light">SKYWAYS</span>
          </h1>
        </div>
        
        <form onSubmit={handleLookup} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search PNR Code..." 
            value={searchPnr}
            onChange={e => setSearchPnr(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-cyan-400 text-white w-full md:w-56 backdrop-blur-sm"
          />
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20">
            Find Ticket
          </button>
        </form>
      </nav>

      {/* PNR Search Results */}
      {searchedBooking && (
        <div className="relative z-10 max-w-3xl mx-auto my-6 bg-cyan-950/70 border border-cyan-500/40 p-6 rounded-2xl flex justify-between items-center backdrop-blur-xl">
          <div>
            <span className="text-xs text-cyan-400 font-mono font-bold">VERIFIED TICKET FOUND</span>
            <h3 className="text-xl font-bold mt-1">{searchedBooking.passenger_name} (Seat {searchedBooking.seat_number})</h3>
            <p className="text-sm text-slate-300">{searchedBooking.aircraft} | {searchedBooking.cabin_class} | {searchedBooking.route}</p>
          </div>
          <button onClick={() => setSearchedBooking(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      {lookupError && (
        <div className="relative z-10 max-w-3xl mx-auto my-6 bg-red-950/60 border border-red-500/40 p-4 rounded-2xl text-red-300 text-sm flex justify-between backdrop-blur-xl">
          <p>{lookupError}</p>
          <button onClick={() => setLookupError('')}>✕</button>
        </div>
      )}

      {/* Hero Header */}
      <header className="relative z-10 max-w-3xl mx-auto text-center px-6 pt-12 pb-10 space-y-3">
        <span className="text-xs font-mono uppercase text-amber-300 tracking-widest bg-amber-500/10 border border-amber-300/20 px-4 py-1.5 rounded-full backdrop-blur-xl">
          Your Flight, Our Absolute Pleasure
        </span>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
          Welcome Aboard
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Experience seamless global travel with Njoroge & Wanjohi SkyWays. Select your route, cabin class, and seat below to reserve your luxury ticket.
        </p>
      </header>

      {/* Main Single Column Flow */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 space-y-12">

        {/* SECTION 1: Choose Aircraft Route */}
        <section className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-2xl shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-slate-950 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black">1</span>
              Choose Aircraft Route
            </h3>
            <span className="text-xs text-cyan-300 font-mono">{selectedFlight.origin} → {selectedFlight.destination}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {flights.map((flight) => (
              <div 
                key={flight.id}
                onClick={() => setSelectedFlight(flight)}
                className={`cursor-pointer rounded-2xl overflow-hidden border transition-all ${
                  selectedFlight.id === flight.id 
                    ? 'bg-white/15 border-cyan-400 shadow-xl shadow-cyan-500/20 scale-[1.02]' 
                    : 'bg-slate-950/60 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="h-32 w-full overflow-hidden bg-slate-800">
                  <img 
                    src={flight.aircraft_image} 
                    alt={flight.aircraft_type} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="p-4 space-y-1">
                  <span className="text-[10px] text-cyan-300 font-bold uppercase">{flight.airline}</span>
                  <h4 className="text-xs font-bold text-white truncate">{flight.aircraft_type}</h4>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                    <span className="text-xs text-slate-300">{flight.origin} → {flight.destination}</span>
                    <span className="text-sm font-black text-amber-300">${flight.base_price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Choose Cabin Class */}
        <section className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-2xl shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-slate-950 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black">2</span>
              Choose Cabin Class
            </h3>
            <span className="text-xs text-fuchsia-300 font-bold">{cabinClass} Selected</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['First Class', 'Business', 'Economy'].map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => handleClassChange(cls)}
                className={`p-5 rounded-2xl font-bold border transition-all text-left space-y-1 ${
                  cabinClass === cls 
                    ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white shadow-lg shadow-fuchsia-500/20' 
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="text-base font-bold text-white">{cls}</div>
                <p className="text-xs text-slate-400">
                  {cls === 'First Class' ? '2.5x base fare' : cls === 'Business' ? '1.6x base fare' : 'Standard fare'}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 3: Select Seat Grid */}
        <section className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-2xl shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-slate-950 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black">3</span>
              Select Seat in {cabinClass}
            </h3>
            <span className="text-xs text-amber-300 font-mono">
              Selected: <strong className="text-sm text-white">{selectedSeat || 'None'}</strong>
            </span>
          </div>

          <div className="bg-slate-950/80 p-6 rounded-2xl border border-white/10 flex flex-col items-center gap-3">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">
              FRONT OF {cabinClass.toUpperCase()} CABIN
            </div>

            {currentConfig.rows.map(row => (
              <div key={row} className="flex gap-3 items-center">
                <span className="w-4 text-xs font-mono text-slate-500 text-center">{row}</span>
                {currentConfig.cols.map((col, idx) => {
                  const seatId = `${row}${col}`;
                  const isOccupied = occupiedSeats.includes(seatId);
                  const isSelected = selectedSeat === seatId;
                  const isAisle = (cabinClass === 'Economy' && idx === 3) || (cabinClass === 'Business' && idx === 2);

                  return (
                    <React.Fragment key={seatId}>
                      {isAisle && <div className="w-6 text-center text-[10px] text-slate-600 font-mono">AISLE</div>}
                      <button
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setSelectedSeat(seatId)}
                        className={`w-11 h-11 rounded-xl font-bold text-xs transition-all flex items-center justify-center border ${
                          isOccupied 
                            ? 'bg-slate-800/50 text-slate-600 border-slate-700/50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-cyan-400 border-cyan-200 text-slate-950 font-black shadow-lg shadow-cyan-400/30 scale-110'
                            : 'bg-slate-900 border-white/20 text-slate-300 hover:border-cyan-400 hover:text-white'
                        }`}
                      >
                        {seatId}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: Passenger Details */}
        <section className="bg-slate-900/50 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-2xl shadow-2xl">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-cyan-500 text-slate-950 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-black">4</span>
              Passenger Details
            </h3>
          </div>

          {booking ? (
            <div className="bg-slate-950/80 p-6 rounded-2xl border border-cyan-500/40 space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-center font-bold text-sm">
                ✓ Booking Saved to Njoroge & Wanjohi SkyWays System
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-xs text-slate-400">PNR CODE</span>
                <span className="font-mono font-bold text-cyan-300">{booking.pnr_code}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-xs text-slate-400">PASSENGER</span>
                <span className="font-bold text-white">{booking.passengers[0].first_name} {booking.passengers[0].last_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-xs text-slate-400">ROUTE & CABIN</span>
                <span className="font-bold text-fuchsia-300">{selectedFlight.origin} → {selectedFlight.destination} ({booking.passengers[0].cabin_class})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">SEAT ASSIGNED</span>
                <span className="font-mono font-bold text-amber-300">{booking.passengers[0].seat_number}</span>
              </div>
              <button 
                onClick={() => setBooking(null)} 
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-all mt-4"
              >
                Book Another Ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" placeholder="First Name" required 
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="bg-slate-950/80 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-400 outline-none text-white" 
                />
                <input 
                  type="text" placeholder="Last Name" required 
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="bg-slate-950/80 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-400 outline-none text-white" 
                />
              </div>

              <input 
                type="email" placeholder="Contact Email" required 
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-400 outline-none text-white" 
              />
              <input 
                type="text" placeholder="Passport Number" required 
                onChange={e => setFormData({...formData, passport: e.target.value})}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-sm focus:border-cyan-400 outline-none text-white" 
              />

              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-2 mt-6">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>AIRCRAFT:</span>
                  <strong className="text-white">{selectedFlight.aircraft_type}</strong>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>CLASS:</span>
                  <strong className="text-fuchsia-300">{cabinClass}</strong>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>SEAT:</span>
                  <strong className="text-amber-300">{selectedSeat || "None"}</strong>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-2">
                  <span className="text-xs text-slate-300 font-bold">TOTAL PRICE:</span>
                  <span className="text-2xl font-black text-amber-300">${calculatedPrice}</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300 font-extrabold rounded-xl text-slate-950 transition-all text-base uppercase tracking-wider shadow-xl shadow-cyan-500/20"
              >
                Confirm & Book Seat
              </button>
            </form>
          )}
        </section>

      </main>
    </div>
  );
}