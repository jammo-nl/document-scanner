use std::process::Command;

fn main() {
    // install node modules and rebuild the frontend
    let path = std::env::current_dir().unwrap();
    let _ = std::env::set_current_dir("webui");
    Command::new("bun").args(&["install"]).status().unwrap();

    if cfg!(feature = "local") {
        Command::new("bun")
            .args(&["run", "build-dev"])
            .status()
            .unwrap();
    }
    if cfg!(feature = "next") {
        Command::new("bun")
            .args(&["run", "build-next"])
            .status()
            .unwrap();
    }
    if cfg!(feature = "prd") {
        Command::new("bun")
            .args(&["run", "build-prd"])
            .status()
            .unwrap();
    }

    let _ = std::env::set_current_dir(path);

    // rebuild if build.rs is changed
    build_deps::rerun_if_changed_paths("build.rs").unwrap();
    build_deps::rerun_if_changed_paths("webui/package.json").unwrap();
    build_deps::rerun_if_changed_paths("webui/postcss.config.js").unwrap();
    build_deps::rerun_if_changed_paths("webui/rsbuild.config.js").unwrap();
    build_deps::rerun_if_changed_paths("webui/tailwind.config.js").unwrap();
    build_deps::rerun_if_changed_paths("webui/tsconfig.json").unwrap();
    build_deps::rerun_if_changed_paths("webui/src/**").unwrap();
}
