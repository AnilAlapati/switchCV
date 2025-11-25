// src/components/recruiter/RequestStats.tsx
interface RequestStatsProps {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  expired: number;
}

export function RequestStats({
  total,
  pending,
  approved,
  denied,
  expired,
}: RequestStatsProps) {
  const stats = { total, pending, approved, denied, expired };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="border rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total Requests</div>
      </div>
      <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
        <div className="text-2xl font-bold text-yellow-800">
          {stats.pending}
        </div>
        <div className="text-sm text-yellow-700">Pending</div>
      </div>
      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
        <div className="text-2xl font-bold text-green-800">
          {stats.approved}
        </div>
        <div className="text-sm text-green-700">Approved</div>
      </div>
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="text-2xl font-bold text-red-800">{stats.denied}</div>
        <div className="text-sm text-red-700">Denied</div>
      </div>
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-800">{stats.expired}</div>
        <div className="text-sm text-gray-600">Expired</div>
      </div>
    </div>
  );
}
