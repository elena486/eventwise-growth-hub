import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Download, Upload, FileText, Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import HandbookUploadModal from '@/components/handbook/HandbookUploadModal';

export default function CompanyHandbook() {
  const { user } = useAuth();
  const [handbook, setHandbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => { loadHandbook(); }, []);

  const loadHandbook = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CompanyHandbook.filter({ is_active: true });
      setHandbook(all[0] || null);
    } catch (e) {
      console.error('Failed to load handbook', e);
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!handbook?.file_uri) return;
    setDownloading(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: handbook.file_uri,
        expires_in: 300,
      });
      const a = document.createElement('a');
      a.href = signed_url;
      a.download = handbook.file_name || 'handbook.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Download failed', e);
    }
    setDownloading(false);
  };

  const handleUploaded = () => {
    setShowUpload(false);
    loadHandbook();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-6 h-6 text-[#8403C5] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Company Handbook</h1>
          <p className="page-subtitle">The current Eventwise Employee Handbook — available to all team members.</p>
        </div>
        {isAdmin && handbook && (
          <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2 shrink-0">
            <Upload className="w-4 h-4" /> Upload New Version
          </button>
        )}
      </div>

      {/* Handbook card */}
      {handbook ? (
        <div className="bg-white border border-ew-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-[#F3E8FF] rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-[#8403C5]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-navy">{handbook.version_label}</h2>
              <div className="flex items-center gap-2 text-sm text-ew-muted mt-1 flex-wrap">
                <span>Uploaded {format(new Date(handbook.uploaded_date), 'd MMM yyyy')}</span>
                {handbook.uploaded_by && (
                  <>
                    <span>·</span>
                    <span>by {handbook.uploaded_by}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-ew-border">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {downloading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing download…</>
              ) : (
                <><Download className="w-4 h-4" /> Download PDF</>
              )}
            </button>
            <p className="text-xs text-ew-muted text-center mt-2">{handbook.file_name}</p>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white border border-dashed border-ew-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-ew-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-ew-muted" />
          </div>
          <h2 className="text-base font-semibold text-navy mb-1">No handbook uploaded yet</h2>
          <p className="text-sm text-ew-muted mb-5">
            {isAdmin ? 'Upload the current handbook PDF so all employees can access it.' : 'Check back soon — an admin will upload the handbook shortly.'}
          </p>
          {isAdmin && (
            <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Handbook
            </button>
          )}
        </div>
      )}

      {showUpload && (
        <HandbookUploadModal
          currentUser={user}
          currentVersion={handbook?.version_label}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}