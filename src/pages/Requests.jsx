import React, { useState, useEffect } from 'react';
import RequestBoard from '@/components/requests/RequestBoard';

export default function Requests({ focusRequestId, onFocusConsumed }) {
  const [boardRefresh, setBoardRefresh] = useState(0);

  // Focus request from global search
  useEffect(() => {
    if (!focusRequestId) return;
    setBoardRefresh(n => n + 1);
    sessionStorage.setItem('focus_request_id', focusRequestId);
    onFocusConsumed?.();
  }, [focusRequestId]);

  return <RequestBoard refresh={boardRefresh} />;
}