import React from 'react';

// Fix: Correctly typed `iconProps` to match `React.SVGProps<SVGSVGElement>` which ensures properties like `strokeLinecap` have the correct union type instead of a generic string.
const iconProps: React.SVGProps<SVGSVGElement> = {
  className: "w-6 h-6",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const PlayIcon = () => <svg {...iconProps}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
export const PauseIcon = () => <svg {...iconProps}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
export const NextIcon = () => <svg {...iconProps}><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>;
export const PrevIcon = () => <svg {...iconProps}><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>;
export const ShuffleIcon = ({ isActive }: { isActive: boolean }) => <svg {...iconProps} className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-gray-400'}`}><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="16 17 21 17 21 22"></polyline><line x1="4" y1="4" x2="11" y2="11"></line></svg>;
export const RepeatIcon = ({ mode }: { mode: 'none' | 'one' | 'all' }) => {
    if (mode === 'one') {
        return <svg {...iconProps} className="w-5 h-5 text-green-400"><path d="M17 2l4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h11"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H7"></path><path d="M11 10h1v4"></path></svg>;
    }
    return <svg {...iconProps} className={`w-5 h-5 ${mode === 'all' ? 'text-green-400' : 'text-gray-400'}`}><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>;
};
export const MusicIcon = () => <svg {...iconProps}><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;
export const PlaylistIcon = () => <svg {...iconProps}><path d="M19 11H5m14 6H5m9-12H5"></path><path d="M15 17l4-3-4-3v6z"></path></svg>;
export const FolderIcon = () => <svg {...iconProps}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"></path></svg>;
export const SearchIcon = () => <svg {...iconProps} className="w-5 h-5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
export const PlusIcon = () => <svg {...iconProps} className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
export const MoreIcon = () => <svg {...iconProps} className="w-5 h-5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
export const XIcon = () => <svg {...iconProps} className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
export const SpinnerIcon = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;