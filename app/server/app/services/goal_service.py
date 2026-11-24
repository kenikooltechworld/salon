from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.goal import Goal, GoalAchievement
from app.models.staff import Staff

class GoalService:
    def __init__(self, session: AsyncSession): self.session=session
    async def _staff(self, tenant_id, staff_id):
        try: sid=uuid.UUID(str(staff_id))
        except Exception: raise HTTPException(status_code=400, detail='Invalid staff ID')
        staff=(await self.session.execute(select(Staff).where(Staff.tenant_id==tenant_id, Staff.id==sid))).scalar_one_or_none()
        if not staff: raise HTTPException(status_code=404, detail='Staff not found')
        return staff
    async def list_for_staff(self, tenant_id, staff_id):
        await self._staff(tenant_id, staff_id)
        now=datetime.now(timezone.utc)
        rows=(await self.session.execute(select(Goal).where(Goal.tenant_id==tenant_id, Goal.staff_id==str(staff_id)).order_by(Goal.created_at.desc()))).scalars().all()
        goals=[]
        active_count=0; completed_count=0
        for g in rows:
            if g.status=='active' and g.period_start <= now <= g.period_end: active_count+=1
            if g.status=='completed': completed_count+=1
            progress=min(100.0, (float(g.current_value or 0)/float(g.target_value))*100) if float(g.target_value or 0)>0 else 0.0
            goals.append({
                'id': str(g.id), 'goal_type': g.goal_type, 'target_value': float(g.target_value), 'current_value': float(g.current_value),
                'period_start': g.period_start.isoformat(), 'period_end': g.period_end.isoformat(), 'status': g.status,
                'progress_percentage': round(progress,1), 'created_at': g.created_at.isoformat(), 'updated_at': g.updated_at.isoformat() if g.updated_at else None,
            })
        overall=round(sum(g['progress_percentage'] for g in goals)/len(goals),1) if goals else 0
        return {'goals': goals, 'total_goals': len(rows), 'completed_goals': completed_count, 'active_goals': active_count, 'overall_progress': overall}
    async def achievements(self, tenant_id, staff_id, limit=25):
        await self._staff(tenant_id, staff_id)
        rows=(await self.session.execute(select(GoalAchievement).where(GoalAchievement.tenant_id==tenant_id, GoalAchievement.staff_id==str(staff_id)).order_by(GoalAchievement.achieved_at.desc()).limit(limit))).scalars().all()
        return {'achievements':[{'id':str(i.id),'goal_id':i.goal_id,'staff_id':i.staff_id,'achieved_at':i.achieved_at.isoformat(),'target_value':float(i.target_value),'achieved_value':float(i.achieved_value),'bonus_earned':float(i.bonus_earned or 0),'incentive_details':i.incentive_details} for i in rows]}
    async def bonuses(self, tenant_id):
        rows=(await self.session.execute(select(Goal).where(Goal.tenant_id==tenant_id).order_by(Goal.created_at.desc()).limit(50))).scalars().all()
        return [{'id':str(g.id),'name':f"{g.goal_type.title()} Target",'description':f"Target of {float(g.target_value)} for {g.goal_type}",'bonus_amount':0.0,'criteria':g.goal_type,'active':g.status=='active'} for g in rows]
    async def performance_vs_targets(self, tenant_id, staff_id):
        await self._staff(tenant_id, staff_id)
        now=datetime.now(timezone.utc)
        rows=(await self.session.execute(select(Goal).where(Goal.tenant_id==tenant_id, Goal.staff_id==str(staff_id), Goal.status=='active', Goal.period_start <= now, Goal.period_end >= now))).scalars().all()
        data={'sales':(0,0.0),'commission':(0,0.0),'appointments':(0,0.0)}
        for g in rows:
            if g.goal_type in data: data[g.goal_type]=(float(g.target_value), float(g.current_value))
        def pct(a,t): return round((a/t)*100,1) if t>0 else 0.0
        return {
            'sales_vs_target': {'target': data['sales'][0], 'actual': round(data['sales'][1],2), 'percentage': pct(data['sales'][1], data['sales'][0])},
            'commission_vs_target': {'target': data['commission'][0], 'actual': round(data['commission'][1],2), 'percentage': pct(data['commission'][1], data['commission'][0])},
            'appointments_vs_target': {'target': data['appointments'][0], 'actual': round(data['appointments'][1],2), 'percentage': pct(data['appointments'][1], data['appointments'][0])},
        }
    async def create(self, tenant_id, staff_id, payload):
        await self._staff(tenant_id, staff_id)
        try:
            start=datetime.fromisoformat(str(payload.period_start).replace('Z','+00:00'))
            end=datetime.fromisoformat(str(payload.period_end).replace('Z','+00:00'))
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid period dates')
        goal=Goal(tenant_id=tenant_id, staff_id=str(staff_id), goal_type=payload.goal_type, target_value=float(payload.target_value), current_value=0.0, period_start=start, period_end=end, status='active', is_active=True)
        self.session.add(goal); await self.session.flush(); await self.session.refresh(goal)
        return goal
