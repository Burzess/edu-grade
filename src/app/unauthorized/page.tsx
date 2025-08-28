import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚫</div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Akses Ditolak
        </h1>
        
        <p className="text-gray-600 mb-6">
          Anda tidak memiliki izin untuk mengakses halaman ini. 
          Silakan login dengan akun yang sesuai atau hubungi administrator.
        </p>

        <div className="space-y-3">
          <Link 
            href="/login"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Login Ulang
          </Link>
          
          <Link 
            href="/"
            className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Ke Halaman Utama
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>Jika Anda yakin ini adalah kesalahan, hubungi tim support.</p>
        </div>
      </div>
    </div>
  );
}
