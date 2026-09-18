import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight, BookOpen, Check, ChevronRight, CircleUserRound, FolderKanban,
  Hash, LayoutDashboard, LogOut, Menu, Plus, Radio, Search, Settings2, Sparkles,
  Trash2, X, Link2
} from 'lucide-react'

const api = async (path, options = {}) => {
  const token = localStorage.getItem('signal-token')
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    })
  } catch {
    throw new Error('Cannot reach the backend. Start it on http://localhost:3000.')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Something went wrong')
  return body
}

const session = {
  get: () => JSON.parse(localStorage.getItem('signal-user') || 'null'),
  set: (user, token) => { localStorage.setItem('signal-user', JSON.stringify(user)); localStorage.setItem('signal-token', token) },
  clear: () => { localStorage.removeItem('signal-user'); localStorage.removeItem('signal-token') }
}

function Protected({ children }) {
  return session.get() ? children : <Navigate to="/login" replace />
}

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/channels', label: 'Channels', icon: Radio },
  { to: '/articles', label: 'Articles', icon: BookOpen },
  { to: '/categories', label: 'Categories', icon: Hash },
  { to: '/category-links', label: 'Category links', icon: Link2 },
  { to: '/profile', label: 'My profile', icon: CircleUserRound }
]

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const user = session.get()
  const location = useLocation()
  const title = navItems.find(item => item.to !== '/' && location.pathname.startsWith(item.to))?.label || 'Overview'
  const logout = () => { session.clear(); navigate('/login') }
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Signal Room</span></div>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="nav-list">{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span>{label === 'Overview' && <span className="nav-dot" />}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="mini-card"><div className="mini-card-icon"><Settings2 size={16} /></div><div><strong>Workspace ready</strong><span>Keep your signal clear.</span></div></div><button className="logout-link" onClick={logout}><LogOut size={16} /> Sign out</button></div>
    </aside>
    {menuOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button><div className="crumb"><span>Workspace</span><ChevronRight size={15} /><strong>{title}</strong></div><div className="top-actions"><div className="search-box"><Search size={16} /><input placeholder="Search your room" /></div><button className="avatar" onClick={() => navigate('/profile')}>{(user?.name || 'U').slice(0, 1).toUpperCase()}</button></div></header>
      <div className="content"><Outlet /></div>
    </main>
  </div>
}

function AuthLayout({ children }) { return <div className="auth-page"><div className="auth-visual"><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Signal Room</span></div><div className="visual-copy"><p className="eyebrow">A calmer way to publish</p><h1>Make space for the ideas worth sharing.</h1><p>Bring channels, stories, and the people behind them into one focused room.</p></div><div className="visual-note"><span className="signal-line" /><span>Thoughtful tools for a noisy world</span></div></div><div className="auth-panel">{children}</div></div> }

function Auth({ mode }) {
  const navigate = useNavigate(); const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'
  const submit = async e => { e.preventDefault(); setBusy(true); setError(''); try { const data = await api(isRegister ? '/register' : '/login', { method: 'POST', body: JSON.stringify(isRegister ? form : { email: form.email, password: form.password }) }); session.set(data.user, data.token); navigate('/') } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <AuthLayout><div className="auth-form"><div className="auth-kicker">{isRegister ? 'Start your room' : 'Welcome back'}</div><h2>{isRegister ? 'Create an account' : 'Enter your workspace'}</h2><p className="muted">{isRegister ? 'Your publishing desk, without the clutter.' : 'Pick up where your next story begins.'}</p><form onSubmit={submit}>{isRegister && <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}<label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>{error && <div className="error-box">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? 'Opening room...' : isRegister ? 'Create workspace' : 'Sign in'} <ArrowUpRight size={16} /></button></form><p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Signal Room?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create one'}</Link></p></div></AuthLayout>
}

function PageHeader({ eyebrow, title, description, action }) { return <div className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div> }
function Stat({ label, value, detail, tone = '' }) { return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div> }
function Empty({ text }) { return <div className="empty-state"><div className="empty-icon"><FolderKanban size={21} /></div><strong>{text}</strong><span>Create your first item to see it here.</span></div> }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{children}</div></div> }

function Overview() {
  const [data, setData] = useState({ channels: [], articles: [], categories: [] }); const [error, setError] = useState('')
  useEffect(() => { Promise.all([api('/channels'), api('/articles'), api('/categories')]).then(([channels, articles, categories]) => setData({ channels: channels.channel || [], articles: articles.articles || [], categories: categories.categories || [] })).catch(err => setError(err.message)) }, [])
  return <><PageHeader eyebrow="Thursday, September 18" title="Good work starts with a clear room." description="Your publishing workspace is ready for the next signal." action={<Link className="primary-button" to="/articles/new"><Plus size={17} /> New article</Link>} />{error && <div className="error-box">{error}</div>}<div className="stats-grid"><Stat label="Channels" value={data.channels.length} detail="Spaces for your voice" tone="sun" /><Stat label="Articles" value={data.articles.length} detail="Stories in the room" tone="mint" /><Stat label="Categories" value={data.categories.length} detail="Ways to find signal" tone="lilac" /></div><div className="overview-grid"><section className="panel focus-panel"><div className="panel-heading"><div><p className="eyebrow">Your room</p><h2>Make the next thing</h2></div><span className="live-pill"><span /> Live</span></div><div className="focus-graphic"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="focus-center"><Sparkles size={26} /><span>Signal</span></div><span className="orbit-label label-one">Ideas</span><span className="orbit-label label-two">People</span><span className="orbit-label label-three">Stories</span></div><div className="focus-footer"><span>Start with one clear thought.</span><Link to="/articles/new">Compose <ArrowUpRight size={14} /></Link></div></section><section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">At a glance</p><h2>Recent articles</h2></div><Link className="text-link" to="/articles">View all <ArrowUpRight size={14} /></Link></div>{data.articles.length ? data.articles.slice(0, 4).map(article => <div className="activity-row" key={article._id}><div className="row-avatar">{(article.title || 'A').slice(0, 1)}</div><div><strong>{article.title}</strong><span>{article.channel?.name || 'Unassigned channel'}</span></div><ChevronRight size={16} /></div>) : <Empty text="No articles yet" />}</section></div></>
}

function DataPage({ type }) {
  const config = { channels: { title: 'Channels', eyebrow: 'Publishing spaces', description: 'Give each voice a home with its own point of view.', endpoint: '/channels', key: 'channel', empty: 'No channels yet', fields: ['name', 'description', 'channelBio'] }, articles: { title: 'Articles', eyebrow: 'Your library', description: 'Keep the stories, links, and context that move your room forward.', endpoint: '/articles', key: 'articles', empty: 'No articles yet', fields: ['channel', 'title', 'description', 'link'] }, categories: { title: 'Categories', eyebrow: 'The filing cabinet', description: 'Simple labels make a growing library feel searchable.', endpoint: '/categories', key: 'categories', empty: 'No categories yet', fields: ['name', 'description'] } }[type]
  const [items, setItems] = useState([]); const [modal, setModal] = useState(false); const [form, setForm] = useState({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => api(config.endpoint).then(data => setItems(data[config.key] || [])).catch(err => setError(err.message))
  useEffect(() => {
    load()
  }, [])
  const submit = async e => { e.preventDefault(); setBusy(true); try { const payload = { ...form }; if (type === 'articles' && !payload.channel) throw new Error('Articles need a channel ID from the backend.') ; const data = await api(config.endpoint, { method: 'POST', body: JSON.stringify(payload) }); setItems(items.concat(data[type === 'channels' ? 'channel' : type === 'articles' ? 'article' : 'category'])); setModal(false); setForm({}) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const remove = async id => { if (!window.confirm('Delete this item?')) return; try { await api(`${config.endpoint}/${id}`, { method: 'DELETE' }); setItems(items.filter(item => item._id !== id)) } catch (err) { setError(err.message) } }
  return <><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} action={<button className="primary-button" onClick={() => setModal(true)}><Plus size={17} /> Add {type.slice(0, -1)}</button>} />{error && <div className="error-box">{error}</div>}<div className={`collection-grid ${type}`}>{items.map(item => <article className="collection-card" key={item._id}><div className="card-top"><span className="card-index">{String(items.indexOf(item) + 1).padStart(2, '0')}</span><button className="icon-button danger" onClick={() => remove(item._id)}><Trash2 size={16} /></button></div><h2>{item.title || item.name}</h2><p>{item.description || item.channelBio || 'No description added yet.'}</p><div className="card-meta">{type === 'articles' ? <><span>{item.channel?.name || 'Article'}</span><ArrowUpRight size={14} /></> : <><span>{type === 'channels' ? 'Broadcast space' : 'Library label'}</span><Check size={14} /></>}</div></article>)}{!items.length && <Empty text={config.empty} />}</div>{modal && <Modal title={`Add ${type.slice(0, -1)}`} onClose={() => setModal(false)}><form className="modal-form" onSubmit={submit}>{config.fields.map(field => <label key={field}>{field === 'channel' ? 'Channel ID' : field.replace(/([A-Z])/g, ' $1')}<input required={field === 'name' || field === 'title' || field === 'channel'} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={field === 'link' ? 'https://...' : `Add ${field}`} /></label>)}<button className="primary-button full" disabled={busy}>{busy ? 'Saving...' : 'Save item'} <Check size={16} /></button></form></Modal>}</>
}

function CategoryLinks() {
  const [links, setLinks] = useState([]); const [categories, setCategories] = useState([]); const [channels, setChannels] = useState([]); const [form, setForm] = useState({ category: '', channel: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { Promise.all([api('/category-channels'), api('/categories'), api('/channels')]).then(([linkData, categoryData, channelData]) => { setLinks(linkData.categoryChannels || []); setCategories(categoryData.categories || []); setChannels(channelData.channel || []) }).catch(err => setError(err.message)) }, [])
  const submit = async e => { e.preventDefault(); setBusy(true); setError(''); try { const data = await api('/category-channels', { method: 'POST', body: JSON.stringify(form) }); setLinks([...links, data.categoryChannel]); setForm({ category: '', channel: '' }) } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const remove = async id => { try { await api(`/category-channels/${id}`, { method: 'DELETE' }); setLinks(links.filter(link => link._id !== id)) } catch (err) { setError(err.message) } }
  return <><PageHeader eyebrow="Organize the room" title="Category links" description="Connect a channel to the labels that help people find it." /><div className="link-layout"><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Create a connection</p><h2>Link channel and category</h2></div><Link2 size={20} color="#b85b43" /></div>{error && <div className="error-box">{error}</div>}<form className="profile-form link-form" onSubmit={submit}><label>Category<select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Choose category</option>{categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>Channel<select required value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}><option value="">Choose channel</option>{channels.map(channel => <option key={channel._id} value={channel._id}>{channel.name}</option>)}</select></label><button className="primary-button" disabled={busy}>{busy ? 'Linking...' : 'Create link'} <Link2 size={16} /></button></form></section><section className="panel links-panel"><div className="panel-heading"><div><p className="eyebrow">Current connections</p><h2>{links.length} linked</h2></div></div>{links.length ? links.map(link => <div className="link-row" key={link._id}><div><strong>{link.category?.name || 'Category'}</strong><span>{link.channel?.name || 'Channel'}</span></div><button className="icon-button danger" onClick={() => remove(link._id)}><Trash2 size={16} /></button></div>) : <Empty text="No links yet" />}</section></div></>
}

function Profile() { const [profile, setProfile] = useState(null); const [form, setForm] = useState({ address: '', phone: '', city: '', country: '' }); const [error, setError] = useState(''); const [saved, setSaved] = useState(false); useEffect(() => { api('/profile/me').then(data => { const value = data.profile || {}; setProfile(value); setForm({ address: value.address || value.adress || '', phone: value.phone || '', city: value.city || '', country: value.country || '' }) }).catch(err => { if (!err.message.toLowerCase().includes('not found')) setError(err.message) }) }, []); const submit = async e => { e.preventDefault(); setError(''); try { const data = await api('/profile/me', { method: profile ? 'PUT' : 'POST', body: JSON.stringify(form) }); setProfile(data.profile); setSaved(true); setTimeout(() => setSaved(false), 2500) } catch (err) { setError(err.message) } }; const user = session.get(); return <><PageHeader eyebrow="Personal details" title="Your profile" description="A little context makes collaboration feel more human." />{error && <div className="error-box">{error}</div>}<div className="profile-layout"><section className="profile-card"><div className="profile-avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</div><h2>{user?.name}</h2><p>{user?.email}</p><span className="role-badge">{user?.role || 'user'}</span></section><section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Profile details</p><h2>Where to find you</h2></div>{saved && <span className="saved"><Check size={14} /> Saved</span>}</div><form onSubmit={submit} className="profile-form">{['address', 'phone', 'city', 'country'].map(field => <label key={field}>{field}<input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={`Your ${field}`} /></label>)}<button className="primary-button">Save details <Check size={16} /></button></form></section></div></> }

function App() {
  return <Routes>
    <Route path="/login" element={<Auth mode="login" />} />
    <Route path="/register" element={<Auth mode="register" />} />
    <Route element={<Protected><Shell /></Protected>}>
      <Route index element={<Overview />} />
      <Route path="channels" element={<DataPage type="channels" />} />
      <Route path="articles" element={<DataPage type="articles" />} />
      <Route path="articles/new" element={<DataPage type="articles" />} />
      <Route path="categories" element={<DataPage type="categories" />} />
      <Route path="category-links" element={<CategoryLinks />} />
      <Route path="profile" element={<Profile />} />
    </Route>
  </Routes>
}

export default App
