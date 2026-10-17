#!/usr/bin/env node
// speckit-gate 56fe353 · https://github.com/phungrk/speckit-ui#approval-gates
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
//#region src/project/types.ts
var GATE_KEYS = [
	"specify",
	"clarify",
	"plan",
	"tasks",
	"analyze",
	"implement"
];
//#endregion
//#region src/project/gates.ts
var GATE_NAME = {
	specify: "Specify",
	clarify: "Clarify",
	plan: "Plan",
	tasks: "Tasks",
	analyze: "Analyze",
	implement: "Implement"
};
var START = "<!-- speckit-ui:gates -->";
var END = "<!-- /speckit-ui:gates -->";
/** The spec slug and gate states in a tracking issue body, or null if it isn't one. */
function parseIssueBody(body) {
	const slug = body.match(/<!-- speckit-ui:spec=([^\s>]+) -->/)?.[1];
	if (!slug) return null;
	const i = body.indexOf(START);
	const j = body.indexOf(END);
	const block = i >= 0 && j > i ? body.slice(i, j) : "";
	const gates = {};
	for (const line of block.split("\n")) {
		const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+([A-Za-z]+)(?:\s+·\s+@([\w-]+))?(?:\s+·\s+(\d{4}-\d{2}-\d{2}))?/);
		const key = m && GATE_KEYS.find((k) => GATE_NAME[k].toLowerCase() === m[2].toLowerCase());
		if (m && key) gates[key] = {
			approved: m[1] !== " ",
			...m[3] ? { by: m[3] } : {},
			...m[4] ? { at: m[4] } : {}
		};
	}
	return {
		slug,
		gates
	};
}
/** Where the Claude Code gate check lives in a project repo, and the settings file that runs it. */
var GATE_HOOK_FILE = "speckit-gate.mjs";
var GATE_HOOK_PATH = `.claude/hooks/${GATE_HOOK_FILE}`;
/**
* The gate that locks each step (index as in PHASES), or null. A step is locked by the first
* unapproved gate among the steps before it that ran; steps that were not run never lock
* anything, and the constitution has no gate. The app, the server and the gate check share this.
*/
function blockingGates(status, issue, mode = "block") {
	let first = null;
	return status.map((s, i) => {
		const locked = mode === "block" ? first : null;
		const k = GATE_KEYS[i - 1];
		if (k && !first && s === "done" && !issue?.gates[k]?.approved) first = k;
		return locked;
	});
}
//#endregion
//#region server/parse.ts
var stripComments = (md) => md.replace(/<!--[\s\S]*?-->/g, "");
var clean = (s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
/** Split markdown at headings of exactly `level`, ignoring headings inside code fences. */
function sections(md, level) {
	const out = [];
	const marker = "#".repeat(level) + " ";
	let fence = false;
	let cur = null;
	for (const line of md.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) fence = !fence;
		if (!fence && line.startsWith(marker)) {
			cur = {
				title: line.slice(marker.length).trim(),
				body: ""
			};
			out.push(cur);
		} else if (cur) cur.body += line + "\n";
	}
	return out;
}
var section = (md, level, title) => sections(md, level).find((s) => title.test(s.title));
/** `**Key**: value` pairs, including several on one line separated by `|`. */
function fields(md) {
	const out = {};
	for (const line of md.split("\n")) for (const m of line.matchAll(/\*\*([^*]+)\*\*:\s*(.*?)(?=\s*\|\s*\*\*[^*]+\*\*:|$)/g)) {
		const key = m[1].trim();
		if (!(key in out) && m[2].trim()) out[key] = m[2].trim().replace(/^`(.*)`$/, "$1");
	}
	return out;
}
var NC = /\[NEEDS CLARIFICATION:?\s*([^\]]*)\]/;
function requirements(md, prefix) {
	const re = new RegExp(`^\\s*[-*]\\s+\\*\\*(${prefix}-\\d+)\\*\\*:?\\s*(.*)$`);
	return md.split("\n").flatMap((line) => {
		const m = line.match(re);
		if (!m) return [];
		const nc = m[2].match(NC);
		return [{
			id: m[1],
			text: clean(m[2].replace(NC, "")),
			...nc ? { clarification: nc[1].trim() || "Needs clarification" } : {}
		}];
	});
}
function stories(md) {
	return sections(md, 3).flatMap((s) => {
		const h = s.title.match(/^User Story\s+(\d+)\s*[-–—:]\s*(.*?)\s*(?:\(Priority:\s*(P\d+)\))?\s*$/i);
		if (!h) return [];
		const lines = s.body.split("\n");
		const para = [];
		for (const l of lines) {
			if (!l.trim()) {
				if (para.length) break;
				continue;
			}
			if (l.trim().startsWith("**") || l.trim().startsWith("#")) {
				if (para.length) break;
				continue;
			}
			para.push(l.trim());
		}
		const ac = lines.flatMap((l) => {
			const m = l.match(/^\s*\d+\.\s+\*\*Given\*\*\s*(.*?)[,;]?\s*\*\*When\*\*\s*(.*?)[,;]?\s*\*\*Then\*\*\s*(.*?)\.?\s*$/i);
			return m ? [[
				clean(m[1]),
				clean(m[2]),
				clean(m[3])
			]] : [];
		});
		return [{
			id: "US" + h[1],
			p: h[3] || "",
			title: h[2],
			text: para.join(" "),
			ac
		}];
	});
}
function clarifications(md) {
	const sec = section(md, 2, /^Clarifications/i);
	if (!sec) return [];
	const out = [];
	let session = "";
	for (const line of sec.body.split("\n")) {
		const s = line.match(/^###\s+Session\s+(.*)$/i);
		if (s) {
			session = s[1].trim();
			continue;
		}
		const m = line.match(/^\s*[-*]\s+Q:\s*(.*?)\s*(?:→|->)\s*A:\s*(.*)$/);
		if (m) out.push({
			session,
			q: clean(m[1]),
			a: clean(m[2])
		});
	}
	return out;
}
function parseSpec(raw) {
	const md = stripComments(raw);
	const h1 = md.match(/^#\s+(.*)$/m)?.[1] ?? "";
	const head = md.split(/^##\s/m)[0];
	return {
		title: h1.replace(/^Feature Specification:\s*/i, "").trim(),
		fields: fields(head),
		stories: stories(md),
		frs: requirements(md, "FR"),
		sc: requirements(md, "SC"),
		needsClarification: (md.match(/\[NEEDS CLARIFICATION/g) || []).length,
		clarifications: clarifications(md),
		raw
	};
}
function parsePlan(raw) {
	const md = stripComments(raw);
	const ctx = section(md, 2, /^Technical Context/i);
	const check = section(md, 2, /^Constitution Check/i);
	return {
		summary: section(md, 2, /^Summary/i)?.body.trim() ?? "",
		context: ctx ? Object.entries(fields(ctx.body)) : [],
		checks: check ? check.body.split("\n").flatMap((l) => {
			const m = l.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
			if (!m) return [];
			const bold = m[2].match(/^\*\*(.+?)\*\*/);
			return [[clean(bold ? bold[1] : m[2]).replace(/:$/, ""), m[1] !== " "]];
		}) : [],
		raw
	};
}
function parseTasks(raw) {
	const phases = [];
	let cur = null;
	for (const line of stripComments(raw).split("\n")) {
		const h = line.match(/^##\s+(.*)$/);
		if (h) {
			const ph = h[1].match(/^Phase\s+\d+\s*:\s*(.*)$/i);
			cur = ph ? {
				name: ph[1].trim(),
				tasks: []
			} : null;
			if (cur) phases.push(cur);
			continue;
		}
		const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(T\d+)\s+(.*)$/);
		if (!m) continue;
		if (!cur) {
			cur = {
				name: "Tasks",
				tasks: []
			};
			phases.push(cur);
		}
		let rest = m[3];
		let parallel = false;
		let story;
		for (let tag = rest.match(/^\[([^\]]+)\]\s*/); tag; tag = rest.match(/^\[([^\]]+)\]\s*/)) {
			if (tag[1] === "P") parallel = true;
			else if (/^US\d+$/.test(tag[1])) story = tag[1];
			else break;
			rest = rest.slice(tag[0].length);
		}
		const path = [...rest.matchAll(/`([^`]+)`/g)].map((x) => x[1]).find((p) => /[/.]/.test(p) && !/\s/.test(p));
		const task = {
			id: m[2],
			done: m[1] !== " ",
			parallel,
			text: rest.trim(),
			...story ? { story } : {},
			...path ? { path } : {}
		};
		cur.tasks.push(task);
	}
	return phases.filter((p) => p.tasks.length);
}
/** Rows of every markdown table in `md`, as objects keyed by lower-cased header. */
function tables(md) {
	const out = [];
	const lines = md.split("\n");
	const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
	for (let i = 0; i < lines.length - 1; i++) {
		if (!lines[i].trim().startsWith("|") || !/^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) continue;
		const head = cells(lines[i]).map((h) => h.toLowerCase());
		const rows = [];
		let j = i + 2;
		for (; j < lines.length && lines[j].trim().startsWith("|"); j++) {
			const c = cells(lines[j]);
			rows.push(Object.fromEntries(head.map((h, k) => [h, c[k] ?? ""])));
		}
		out.push(rows);
		i = j - 1;
	}
	return out;
}
function parseAnalysis(raw) {
	const md = stripComments(raw);
	const pick = (r, ...keys) => keys.map((k) => r[k]).find((v) => v !== void 0) ?? "";
	return {
		findings: tables(md).filter((rows) => rows.length && "id" in rows[0] && "severity" in rows[0]).flat().filter((r) => r.id && !/^-+$/.test(r.id)).map((r) => ({
			id: clean(r.id),
			category: clean(pick(r, "category")),
			severity: clean(r.severity).toUpperCase(),
			location: clean(pick(r, "location(s)", "location", "locations")),
			summary: clean(pick(r, "summary")),
			recommendation: clean(pick(r, "recommendation"))
		})),
		raw
	};
}
function parseChecklist(name, raw) {
	const items = raw.match(/^\s*[-*]\s+\[( |x|X)\]/gm) || [];
	return {
		name,
		total: items.length,
		done: items.filter((i) => /\[(x|X)\]/.test(i)).length
	};
}
/** Branch prefixes read for unmerged specs when the repo sets none (specs/003). */
var DEFAULT_BRANCH_PREFIXES = ["feat/"];
var strings = (v) => Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null;
/**
* Optional `.specify/speckit-ui.json`, e.g.
* `{ "mergeOrder": ["edge", "wedding-front"], "branchPrefixes": ["feat/"], "approvalGates": "off" }`.
* Every field has a default.
*/
function parseUiConfig(raw) {
	try {
		const cfg = JSON.parse(raw || "{}");
		return {
			mergeOrder: Array.isArray(cfg.mergeOrder) ? cfg.mergeOrder.filter((x) => typeof x === "string") : [],
			branchPrefixes: strings(cfg.branchPrefixes) ?? DEFAULT_BRANCH_PREFIXES,
			approvalGates: cfg.approvalGates === "off" ? "off" : "block"
		};
	} catch {
		return {
			mergeOrder: [],
			branchPrefixes: DEFAULT_BRANCH_PREFIXES,
			approvalGates: "block"
		};
	}
}
//#endregion
//#region server/github.ts
var DOCS = [
	"research.md",
	"data-model.md",
	"quickstart.md"
];
/** A spec folder parsed from its files; `read(f)` gives the text of a file in the folder. */
function buildFeature(dir, files, read, sha) {
	const spec = read("spec.md");
	const plan = read("plan.md");
	const tasks = read("tasks.md");
	const analysis = read("analysis.md");
	const parsedSpec = spec ? parseSpec(spec) : null;
	const sorted = [...files].sort();
	return {
		id: dir.match(/^\d+/)[0],
		slug: dir,
		title: parsedSpec?.title || dir.replace(/^\d+-/, "").replace(/-/g, " "),
		files: sorted,
		spec: parsedSpec,
		plan: plan ? parsePlan(plan) : null,
		tasks: tasks ? parseTasks(tasks) : null,
		analysis: analysis ? parseAnalysis(analysis) : null,
		checklists: sorted.filter((f) => /^checklists\/[^/]+\.md$/.test(f) && read(f) !== null).map((f) => parseChecklist(f.slice(11), read(f))),
		docs: Object.fromEntries(DOCS.flatMap((d) => read(d) !== null ? [[d, read(d)]] : [])),
		branch: null,
		sha,
		unmerged: false,
		variants: []
	};
}
//#endregion
//#region src/project/status.ts
var allTasks = (f) => (f.tasks || []).flatMap((p) => p.tasks);
/**
* Where a spec stands, derived from the files Spec Kit has written. A spec may set
* `**Track**: light` to stop after Plan, matching projects that run only specify + plan.
*/
function phaseStatus(project, f) {
	const tasks = allTasks(f);
	const light = /^light/i.test(f.spec?.fields.Track || "");
	const started = tasks.some((t) => t.done);
	const has = [
		!!project.constitution,
		!!f.spec,
		!!f.spec?.clarifications.length,
		!!f.plan,
		!!f.tasks,
		!!f.analysis,
		tasks.length > 0 && tasks.every((t) => t.done)
	];
	const skip = [
		false,
		false,
		!has[2] && (!!f.plan || !!f.spec && f.spec.needsClarification === 0),
		false,
		light && !f.tasks,
		!has[5] && (started || light && !f.tasks),
		light && !f.tasks
	];
	const out = has.map((h, i) => h ? "done" : skip[i] ? "skipped" : "pending");
	const cur = out.findIndex((s) => s === "pending");
	if (cur >= 0) out[cur] = "current";
	return out;
}
//#endregion
//#region hook/speckit-gate.ts
/** Gated commands and their step (index in PHASES): Clarify … Implement (R3). */
var GATED = {
	clarify: 2,
	plan: 3,
	tasks: 4,
	analyze: 5,
	implement: 6
};
var COMMAND = /^\/?(?:[\w-]+:)?speckit[-.](clarify|plan|tasks|analyze|implement)(?=\s|$)\s*(.*)$/s;
/** Which gated command this hook input is, if any. */
function readTarget(input) {
	if (input.hook_event_name === "PreToolUse" || input.tool_name !== void 0) {
		if (input.tool_name !== "Skill") return null;
		const ti = input.tool_input ?? {};
		const name = [
			ti.skill,
			ti.name,
			ti.command
		].find((x) => typeof x === "string");
		const args = [ti.args, ti.arguments].find((x) => typeof x === "string");
		const m = name?.trim().match(COMMAND);
		return m ? {
			step: GATED[m[1]],
			command: m[1],
			args: (args ?? m[2] ?? "").trim(),
			event: "tool"
		} : null;
	}
	const m = typeof input.prompt === "string" ? input.prompt.trim().match(COMMAND) : null;
	return m && m[0].startsWith("/") ? {
		step: GATED[m[1]],
		command: m[1],
		args: m[2].trim(),
		event: "prompt"
	} : null;
}
var read = (p) => {
	try {
		return readFileSync(p, "utf8");
	} catch {
		return null;
	}
};
var isDir = (p) => {
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
};
/** The spec folder the command is for: argument, SPECIFY_FEATURE, .specify/feature.json, then the branch (R4). */
function resolveSpec(root, args, env, git) {
	const dir = join(root, "specs");
	const dirs = isDir(dir) ? readdirSync(dir).filter((d) => /^\d{3,}-/.test(d) && isDir(join(dir, d))) : [];
	const match = (s) => {
		if (!s) return null;
		const name = s.trim().replace(/\/+$/, "").split("/").pop();
		return dirs.find((d) => d === name) ?? (/^\d{3,}$/.test(name) ? dirs.find((d) => d.startsWith(name + "-")) : null) ?? dirs.find((d) => name.endsWith(d)) ?? null;
	};
	const first = args.split(/\s+/)[0];
	if (/^\d{3,}(-[\w.-]+)?$/.test(first)) {
		const m = match(first);
		if (m) return m;
	}
	const fromEnv = match(env.SPECIFY_FEATURE);
	if (fromEnv) return fromEnv;
	try {
		const fd = JSON.parse(read(join(root, ".specify", "feature.json")) || "{}").feature_directory;
		const m = typeof fd === "string" ? match(fd) : null;
		if (m) return m;
	} catch {}
	const b = git([
		"rev-parse",
		"--abbrev-ref",
		"HEAD"
	])?.match(/(\d{3,}-[\w.-]+)$/)?.[1];
	return match(b);
}
/** Every file under specs/<slug>/, relative to it, with / separators. */
function filesIn(dir) {
	const out = [];
	const walk = (d) => {
		for (const e of readdirSync(d)) {
			const p = join(d, e);
			if (isDir(p)) walk(p);
			else out.push(relative(dir, p).split(sep).join("/"));
		}
	};
	walk(dir);
	return out;
}
var repoOf = (url) => url?.trim().match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)?.slice(1, 3).join("/") ?? null;
var CantCheck = class extends Error {};
async function trackingIssue(deps, slug) {
	const repo = repoOf(deps.git([
		"remote",
		"get-url",
		"origin"
	]));
	if (!repo) throw new CantCheck("this repository has no GitHub remote named origin");
	let r;
	try {
		r = await deps.github(`/repos/${repo}/issues?state=all&labels=speckit&per_page=100`);
	} catch (e) {
		throw new CantCheck(e instanceof Error ? e.message : String(e));
	}
	if (r.status !== 200) throw new CantCheck(`GitHub answered ${r.status} for ${repo} issues`);
	const items = JSON.parse(r.body);
	for (const i of items) {
		if (i.pull_request) continue;
		const parsed = parseIssueBody(i.body || "");
		if (parsed?.slug === slug) return {
			number: i.number,
			url: i.html_url,
			state: i.state,
			gates: parsed.gates,
			updatedAt: null
		};
	}
	return null;
}
/** Decide one hook input. Pure apart from reading files and GitHub through `deps`. */
async function run(inputText, deps) {
	let input;
	try {
		input = JSON.parse(inputText || "{}");
	} catch {
		return { code: 0 };
	}
	const target = readTarget(input);
	if (!target) return { code: 0 };
	const cfg = parseUiConfig(read(join(deps.root, ".specify", "speckit-ui.json")));
	if (cfg.approvalGates === "off") return { code: 0 };
	const slug = resolveSpec(deps.root, target.args, deps.env, deps.git);
	if (!slug) return { code: 0 };
	const dir = join(deps.root, "specs", slug);
	const f = buildFeature(slug, filesIn(dir), (x) => read(join(dir, x)), "");
	const status = phaseStatus({ constitution: read(join(deps.root, ".specify", "memory", "constitution.md")) ? {} : null }, f);
	if (!status.slice(1, target.step).some((s) => s === "done")) return { code: 0 };
	const cmd = `/speckit-${target.command}`;
	let issue;
	try {
		issue = await trackingIssue(deps, slug);
	} catch (e) {
		const why = e instanceof Error ? e.message : String(e);
		const bypass = deps.env.SPECKIT_GATE_BYPASS?.trim();
		if (bypass) return allow(target, `Approval gate check bypassed for ${slug}: ${bypass} (could not check: ${why}).`);
		return {
			code: 2,
			stderr: `Could not check approvals for ${slug}: ${why}. To run ${cmd} anyway, set SPECKIT_GATE_BYPASS="<why>" and try again.`
		};
	}
	const k = blockingGates(status, issue, cfg.approvalGates)[target.step];
	if (!k) return { code: 0 };
	return {
		code: 2,
		stderr: `Approve ${GATE_NAME[k]} for ${slug} before running ${cmd}. ${issue ? `Tracking issue: ${issue.url}` : "Approve it in speckit-ui."}`
	};
}
/** Let the command run, and leave the reason in the session on both paths (FR-008). */
function allow(target, reason) {
	if (target.event === "tool") return {
		code: 0,
		stdout: JSON.stringify({ hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "allow",
			permissionDecisionReason: reason
		} })
	};
	return {
		code: 0,
		stdout: reason
	};
}
var HOOK_COMMAND = `command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/${GATE_HOOK_PATH}"`;
var entry = () => ({
	type: "command",
	timeout: 30,
	command: HOOK_COMMAND
});
/** Add the two hooks to .claude/settings.json, keeping everything else; running it twice adds nothing. */
function install(root) {
	const file = join(root, ".claude", "settings.json");
	const raw = read(file);
	let s;
	try {
		s = raw ? JSON.parse(raw) : {};
	} catch {
		throw new Error(`${file} is not valid JSON; fix it and run install again.`);
	}
	s.hooks ??= {};
	const has = (event) => (s.hooks[event] ?? []).some((g) => (g.hooks ?? []).some((h) => (h.command ?? "").includes(GATE_HOOK_FILE)));
	const added = [];
	if (!has("UserPromptSubmit")) {
		(s.hooks.UserPromptSubmit ??= []).push({ hooks: [entry()] });
		added.push("UserPromptSubmit");
	}
	if (!has("PreToolUse")) {
		(s.hooks.PreToolUse ??= []).push({
			matcher: "Skill",
			hooks: [entry()]
		});
		added.push("PreToolUse (Skill)");
	}
	if (!added.length) return `${file} already runs the gate check.`;
	mkdirSync(join(root, ".claude"), { recursive: true });
	writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
	return `Added ${added.join(" and ")} to ${file}. Commit .claude/ so everyone working on the repo gets it.`;
}
var run_ = (cmd, args, cwd) => {
	try {
		return execFileSync(cmd, args, {
			cwd,
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			timeout: 2e4
		}).trim();
	} catch {
		return null;
	}
};
/** gh first (it carries the session's or the user's login), else a token from the environment (R5). */
function nodeGithub(env, cwd) {
	return async (path) => {
		if (run_("gh", ["--version"], cwd) !== null) try {
			return {
				status: 200,
				body: execFileSync("gh", ["api", path.replace(/^\//, "")], {
					cwd,
					encoding: "utf8",
					stdio: [
						"ignore",
						"pipe",
						"pipe"
					],
					timeout: 2e4
				})
			};
		} catch (e) {
			const err = String(e.stderr ?? e);
			const status = Number(err.match(/HTTP (\d{3})/)?.[1]);
			if (status) return {
				status,
				body: ""
			};
			throw new Error(`gh api failed: ${err.split("\n")[0].slice(0, 200)}`);
		}
		const token = env.GH_TOKEN || env.GITHUB_TOKEN;
		if (!token) throw new Error("no GitHub access: install and log in to gh, or set GH_TOKEN");
		const res = await fetch(`https://api.github.com${path}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json"
			},
			signal: AbortSignal.timeout(2e4)
		});
		return {
			status: res.status,
			body: await res.text()
		};
	};
}
function nodeDeps(env, cwd) {
	const root = env.CLAUDE_PROJECT_DIR || cwd;
	return {
		root,
		env,
		git: (args) => run_("git", args, root),
		github: nodeGithub(env, root)
	};
}
async function main(argv) {
	const env = process.env;
	const cwd = process.cwd();
	if (argv[0] === "--version") return {
		code: 0,
		stdout: `speckit-gate 56fe353`
	};
	if (argv[0] === "install") return {
		code: 0,
		stdout: install(env.CLAUDE_PROJECT_DIR || cwd)
	};
	if (argv[0] === "check") {
		const [spec = "", step = "plan"] = argv.slice(1);
		const r = await run(JSON.stringify({
			hook_event_name: "UserPromptSubmit",
			prompt: `/speckit-${step} ${spec}`
		}), nodeDeps(env, cwd));
		return {
			code: r.code,
			stdout: r.code === 0 ? r.stdout ?? `/speckit-${step} ${spec}: allowed.` : void 0,
			stderr: r.stderr
		};
	}
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	const ti = JSON.parse(input || "{}");
	return run(input, nodeDeps(env, ti.cwd || cwd));
}
if (typeof process !== "undefined" && process.argv[1] && /speckit-gate\.(mjs|ts)$/.test(process.argv[1])) main(process.argv.slice(2)).then((r) => {
	if (r.stdout) process.stdout.write(r.stdout + "\n");
	if (r.stderr) process.stderr.write(r.stderr + "\n");
	process.exitCode = r.code;
}, (e) => {
	process.stderr.write(`speckit gate: ${e instanceof Error ? e.message : e}\n`);
	process.exitCode = 2;
});
//#endregion
export { install, nodeDeps, nodeGithub, readTarget, resolveSpec, run };
