import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import "./Housekeeping.css";

export default function HousekeepingDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [task, setTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [assignInput, setAssignInput] = useState('');

  useEffect(()=>{
    let mounted = true;
    async function load(){
      setLoading(true); setError(null);
      try{
        const res = await api.get(`/housekeeping/${id}/`);
        if(!mounted) return;
        setTask(res.data);
      }catch(err){
        if(!mounted) return;
        setError(err.response?.data || err.message || 'Failed to load task');
      }finally{ if(mounted) setLoading(false) }
    }
    load();
    return ()=> mounted = false;
  },[id]);

  async function doPatch(patch, action){
    setActionLoading(action); setError(null);
    try{
      const res = await api.patch(`/housekeeping/${id}/`, patch);
      setTask(res.data);
    }catch(err){
      const resp = err.response;
      setError(resp?.data || err.message || 'Action failed');
    }finally{ setActionLoading(null) }
  }

  return (
    <div className="housekeeping-root">
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-ghost small" onClick={()=> navigate('/housekeeping')}>Back to Housekeeping</button>
        <button className="btn-ghost small" onClick={()=> navigate(`/housekeeping/${id}/edit`)}>Edit</button>
      </div>

      <h1>Housekeeping Task</h1>

      {loading && <div className="housekeeping-loading">Loading task…</div>}
      {error && <div className="housekeeping-error">Error: {JSON.stringify(error)}</div>}

      {!loading && !error && task && (
        <div className="housekeeping-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{task.task_type} — Room {task.room_details?.room_number || task.room || ''}</h2>
              <div>{task.notes || ''}</div>
            </div>
            <div>{task.status ? <span className={`badge res-status-${task.status.toLowerCase()}`}>{task.status}</span> : null}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div><strong>Hotel:</strong> {task.hotel || '-'}</div>
            <div><strong>Room:</strong> {task.room || '-'}</div>
            <div><strong>Priority:</strong> {task.priority || '-'}</div>
            <div><strong>Assigned:</strong> {task.assigned_to ? (task.assigned_to_details?.email || task.assigned_to) : '-'}</div>
            <div><strong>Scheduled:</strong> {task.scheduled_for || '-'}</div>
            <div><strong>Started:</strong> {task.started_at || '-'}</div>
            <div><strong>Completed:</strong> {task.completed_at || '-'}</div>
            <div><strong>Created:</strong> {task.created_at || '-'}</div>
            <div><strong>Updated:</strong> {task.updated_at || '-'}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Assign user */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder="Assign user id" value={assignInput} onChange={(e)=> setAssignInput(e.target.value)} />
              <button className="btn-ghost" disabled={actionLoading !== null} onClick={async ()=>{
                if(!assignInput) return setError('Provide user id to assign');
                if(!window.confirm('Assign this task?')) return;
                await doPatch({ assigned_to: assignInput }, 'assign');
              }}>{actionLoading === 'assign' ? 'Assigning…' : 'Assign'}</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>
                Status
                <select
                  value={task.status}
                  disabled={actionLoading !== null}
                  onChange={(e) => doPatch({ status: e.target.value }, 'status')}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
            </div>

            {/* Status transitions */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {task.status === 'PENDING' && (
                <button className="btn" disabled={actionLoading !== null} onClick={async ()=>{
                  if(!window.confirm('Mark as in progress?')) return;
                  await doPatch({ status: 'IN_PROGRESS' }, 'start');
                }}>{actionLoading === 'start' ? 'Starting…' : 'Start'}</button>
              )}

              {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && (
                <button className="btn" disabled={actionLoading !== null} onClick={async ()=>{
                  if(!window.confirm('Mark as completed?')) return;
                  await doPatch({ status: 'COMPLETED' }, 'complete');
                }}>{actionLoading === 'complete' ? 'Completing…' : 'Complete'}</button>
              )}

              {task.status !== 'CANCELLED' && (
                <button className="btn-ghost" disabled={actionLoading !== null} onClick={async ()=>{
                  if(!window.confirm('Cancel this task?')) return;
                  await doPatch({ status: 'CANCELLED' }, 'cancel');
                }}>{actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel'}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
