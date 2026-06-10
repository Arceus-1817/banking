import { useState } from 'react';
import axios from 'axios';
import { G } from '../../theme';

export default function LogisticsTab({ routes, customers, authH, fetchAll }) {
  // Local state purely for the Drag-and-Drop UI
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeCustomers, setRouteCustomers] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleCreateRoute = async () => {
    const name = window.prompt("Enter new route name (e.g., MG Road):");
    if (name) {
      try {
        await axios.post('http://localhost:8085/api/routes', { name }, authH);
        fetchAll(); // Refresh routes from backend
      } catch(_e) {
        alert("Failed to create route.");
      }
    }
  };

  const handleSaveSequence = async () => {
    const orderedIds = routeCustomers.map(c => c.id);
    try {
      await axios.put(`http://localhost:8085/api/customers/route/${selectedRoute.id}/sequence`, orderedIds, authH);
      alert("Sequence Saved Successfully!");
      fetchAll();
    } catch(_e) {
      alert("Failed to save sequence");
    }
  };

  const handleRemoveCustomer = async (c) => {
    try {
      await axios.put(`http://localhost:8085/api/customers/${c.id}/route/null`, {}, authH);
      setRouteCustomers(routeCustomers.filter(rc => rc.id !== c.id));
      fetchAll();
    } catch(_e) {
      alert("Failed to remove customer");
    }
  };

  return (
    <div>
      <div className="fade-up" style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, letterSpacing:'-.02em' }}>Route Optimizer</h1>
          <p style={{ color:G.textSub, fontSize:12, marginTop:4 }}>Drag and drop customers to map out the perfect walking path.</p>
        </div>
        <button className="btn-primary" onClick={handleCreateRoute}>+ Create Route</button>
      </div>

      <div className="fade-up-1" style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20 }}>

        {/* ── LEFT SIDE: Route List ── */}
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:20 }}>
          <h3 style={{ fontSize:14, marginBottom:16, color:G.text }}>Active Routes</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {routes.length === 0 ? <div style={{ fontSize:12, color:G.muted }}>No routes created yet.</div> : routes.map(r => {
              const custCount = customers.filter(c => c.route?.id === r.id).length;
              const isActive = selectedRoute?.id === r.id;
              return (
                <div key={r.id} onClick={() => {
                  setSelectedRoute(r);
                  // Sort them by their saved sequence number, or default to the bottom
                  const rc = customers.filter(c => c.route?.id === r.id).sort((a,b) => (a.routeSequence||999) - (b.routeSequence||999));
                  setRouteCustomers(rc);
                }} style={{ padding:14, background: isActive ? G.accentBg : G.surface, border:`1px solid ${isActive ? G.accent+'55' : G.border}`, borderRadius:8, cursor:'pointer', transition:'all .2s' }}>
                  <div style={{ fontWeight:600, color: isActive ? G.accent : G.text, fontSize:13 }}>{r.name}</div>
                  <div style={{ fontSize:11, color:G.textSub, marginTop:4 }}>{custCount} shops assigned</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT SIDE: Drag & Drop Sequencer ── */}
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:G.rLg, padding:20, minHeight:500 }}>
          {!selectedRoute ? (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:G.muted, fontSize:13 }}>
              Select a route from the left to arrange its shops.
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:`1px solid ${G.border}` }}>
                <div>
                  <h3 style={{ fontSize:18, color:G.text, fontFamily:'var(--font-display)', fontWeight:700 }}>{selectedRoute.name}</h3>
                  <div style={{ fontSize:12, color:G.textSub, marginTop:4 }}>Drag the handle (☰) to reorder the walking sequence.</div>
                </div>
                <button className="btn-primary" onClick={handleSaveSequence}>Save Map Order</button>
              </div>

              {/* The Draggable List */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {routeCustomers.length === 0 ? <div style={{ fontSize:12, color:G.warn }}>No customers assigned to this route yet.</div> :
                 routeCustomers.map((c, i) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggedIdx(i)}
                    onDragOver={(e) => e.preventDefault()} // Necessary to allow dropping
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedItem = routeCustomers[draggedIdx];
                      const remainingItems = routeCustomers.filter((_, idx) => idx !== draggedIdx);
                      // Insert the dragged item at the new position
                      const newArr = [...remainingItems.slice(0, i), draggedItem, ...remainingItems.slice(i)];
                      setRouteCustomers(newArr);
                      setDraggedIdx(null);
                    }}
                    style={{
                      padding:'12px 16px', background:G.surface, border:`1px solid ${G.borderHi}`, borderRadius:8,
                      display:'flex', alignItems:'center', gap:16, cursor:'grab', opacity: draggedIdx === i ? 0.5 : 1
                    }}
                  >
                    <div style={{ fontSize:16, color:G.muted, cursor:'grab' }}>☰</div>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:`${G.accent}22`, color:G.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:G.text }}>{c.name}</div>
                      <div style={{ fontSize:11, color:G.textSub }}>ACC: {c.accountNumber}</div>
                    </div>
                    <button className="btn-danger" style={{ padding:'4px 10px', fontSize:10 }} onClick={() => handleRemoveCustomer(c)}>Remove</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}