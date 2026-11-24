from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.goal_service import GoalService
from app.schemas.goal import GoalCreate

class GoalController:
    def __init__(self, session: AsyncSession): self.service=GoalService(session); self.session=session
    async def staff_goals(self, tenant_id, staff_id): return await self.service.list_for_staff(tenant_id, staff_id)
    async def achievements(self, tenant_id, staff_id, limit=25): return await self.service.achievements(tenant_id, staff_id, limit)
    async def bonuses(self, tenant_id): return await self.service.bonuses(tenant_id)
    async def performance_vs_targets(self, tenant_id, staff_id): return await self.service.performance_vs_targets(tenant_id, staff_id)
    async def create(self, tenant_id, staff_id, data: GoalCreate):
        row=await self.service.create(tenant_id, staff_id, data); await self.session.commit()
        return {'id': str(row.id), 'status': row.status}
